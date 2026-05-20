import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import PublicPayment from './components/PublicPayment.jsx'
import './index.css'

const path = window.location.pathname;
const payMatch = path.match(/^\/pay\/(.+)$/);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {payMatch
      ? <PublicPayment transactionId={payMatch[1]} />
      : <App />}
  </React.StrictMode>,
)
