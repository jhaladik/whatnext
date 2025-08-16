// Pages Function: /api/movies/start
// Start a new movie recommendation session

import { MomentCaptureService } from '../../services/momentCaptureService.js';
import { DomainService } from '../../services/domainService.js';
import { UserState } from '../../models/userState.js';

export async function onRequest(context) {
  const { request, env } = context;
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  // Handle OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }
  
  try {
    // Parse request body
    let data = {};
    try {
      if (request.headers.get('content-type')?.includes('application/json')) {
        data = await request.json();
      }
    } catch (e) {
      return new Response(JSON.stringify({
        error: 'Invalid JSON in request body'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    const { 
      domain = 'movies', 
      context = {}, 
      questionFlow = 'standard' 
    } = data;
    
    // Generate session ID
    const sessionId = crypto.randomUUID();
    
    // Initialize services
    const momentCapture = new MomentCaptureService(env);
    const domainService = new DomainService(env);
    
    // Generate adaptive question flow
    const questionFlowData = await momentCapture.generateQuestionFlow(context, questionFlow);
    const firstQuestion = questionFlowData.questions[0];
    
    // Initialize session
    const userState = new UserState(sessionId);
    userState.domain = domain;
    userState.currentQuestionIndex = 0;
    userState.context = { ...context, ...questionFlowData.context };
    userState.totalQuestions = questionFlowData.questions.length;
    userState.questionFlow = questionFlow;
    userState.flowType = questionFlowData.flowType;
    
    // Store session
    await env.USER_SESSIONS.put(
      `session:${sessionId}`,
      JSON.stringify({
        ...userState,
        questions: questionFlowData.questions
      }),
      { expirationTtl: env.SESSION_TIMEOUT_SECONDS || 3600 }
    );
    
    // Return response
    return new Response(JSON.stringify({
      sessionId,
      domain,
      greeting: questionFlowData.greeting,
      question: firstQuestion,
      progress: {
        current: 1,
        total: userState.totalQuestions
      },
      flowType: questionFlowData.flowType,
      context: questionFlowData.context
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('Error starting session:', error);
    return new Response(JSON.stringify({
      error: 'Failed to start session',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

// Handle OPTIONS for this specific endpoint
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}