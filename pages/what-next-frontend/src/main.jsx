import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import DonationSuccessWrapper from './pages/DonationSuccessWrapper.jsx'
import DonationCancelWrapper from './pages/DonationCancelWrapper.jsx'
import TermsWrapper from './pages/TermsWrapper.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/donation/success" element={<DonationSuccessWrapper />} />
        <Route path="/donation/cancel" element={<DonationCancelWrapper />} />
        <Route path="/terms" element={<TermsWrapper />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
