import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchManagerPendingRequests,
  fetchManagerPendingRequestsSummary,
} from '../../api/expenses'

export default function ManagerPendingRequestsDashboard() {
  const [requests, setRequests] = useState([])
  const [summary, setSummary] = useState({ pendingCount: 0, totalAmount: 0, currency: 'USD' })
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)

  const calculatedSummary = useMemo(
    () => calculateDashboardSummary(requests),
    [requests],
  )

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const requestsResult = await fetchManagerPendingRequests()
      const summaryResult = await fetchManagerPendingRequestsSummary().catch(() => null)

      setRequests(requestsResult)
      setSummary(summaryResult ?? calculateDashboardSummary(requestsResult))
    } catch (error) {
      setErrorMessage(error.message)
      setRequests([])
      setSummary({ pendingCount: 0, totalAmount: 0, currency: 'USD' })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isCurrent = true

    async function loadCurrentDashboard() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const requestsResult = await fetchManagerPendingRequests()
        const summaryResult = await fetchManagerPendingRequestsSummary().catch(() => null)

        if (!isCurrent) return

        setRequests(requestsResult)
        setSummary(summaryResult ?? calculateDashboardSummary(requestsResult))
      } catch (error) {
        if (!isCurrent) return

        setErrorMessage(error.message)
        setRequests([])
        setSummary({ pendingCount: 0, totalAmount: 0, currency: 'USD' })
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
      }
    }

    loadCurrentDashboard()

    return () => {
      isCurrent = false
    }
  }, [])

  const displaySummary = isLoading ? summary : summary ?? calculatedSummary

  return (
    <section className="manager-dashboard">
      <div className="page-title-row manager-dashboard-heading">
        <div>
          <p className="eyebrow">Manager Dashboard</p>
          <h1>Pending Requests</h1>
          <p>Requests currently waiting for your approval.</p>
        </div>
        <button
          className="secondary-button manager-dashboard-refresh"
          type="button"
          onClick={loadDashboard}
          disabled={isLoading}
        >
          Refresh
        </button>
      </div>

      <DashboardSummaryCards summary={displaySummary} isLoading={isLoading} />

      <div className="card manager-requests-card">
        <div className="manager-requests-card-header">
          <div>
            <h2>Team Requests</h2>
            <p className="muted">Pending manager approvals from direct team members.</p>
          </div>
        </div>

        {isLoading && (
          <div className="dashboard-state" role="status">
            Loading pending requests...
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="dashboard-state error-state" role="alert">
            <strong>Unable to load pending requests.</strong>
            <span>{errorMessage}</span>
          </div>
        )}

        {!isLoading && !errorMessage && requests.length === 0 && (
          <div className="dashboard-state empty-state">
            <strong>No pending requests</strong>
            <span>Your team has no requests waiting for manager approval.</span>
          </div>
        )}

        {!isLoading && !errorMessage && requests.length > 0 && (
          <PendingRequestsTable requests={requests} />
        )}
      </div>
    </section>
  )
}

function DashboardSummaryCards({ summary, isLoading }) {
  return (
    <div className="manager-summary-grid" aria-label="Pending requests summary">
      <article className="card manager-summary-card">
        <span>Pending Requests</span>
        <strong>{isLoading ? '-' : summary.pendingCount}</strong>
      </article>
      <article className="card manager-summary-card">
        <span>Total Amount</span>
        <strong>{isLoading ? '-' : formatCurrency(summary.totalAmount, summary.currency)}</strong>
      </article>
    </div>
  )
}

function PendingRequestsTable({ requests }) {
  return (
    <div className="table-scroll manager-table-scroll">
      <table className="line-items-table manager-requests-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Request Type</th>
            <th>Amount</th>
            <th>Created Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id}>
              <td>
                <strong>{request.employeeName}</strong>
              </td>
              <td>{request.requestType}</td>
              <td>{formatCurrency(request.amount, request.currency)}</td>
              <td>{formatDate(request.createdDate)}</td>
              <td>
                <span className="status-pill">{request.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function calculateDashboardSummary(requests) {
  return {
    pendingCount: requests.length,
    totalAmount: requests.reduce((total, request) => total + Number(request.amount || 0), 0),
    currency: requests[0]?.currency ?? 'USD',
  }
}

function formatCurrency(value, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value)
  } catch {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }
}

function formatDate(dateString) {
  if (!dateString) return '-'

  const date = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return dateString
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}
