import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchManagerPendingRequests,
  fetchManagerPendingRequestsSummary,
} from '../../api/expenses'
import SearchBar from '../ui/SearchBar'

export default function ManagerPendingRequestsDashboard() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [summary, setSummary] = useState({ pendingCount: 0, totalAmount: 0, currency: 'USD' })
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)

  const calculatedSummary = useMemo(
    () => calculateDashboardSummary(requests),
    [requests],
  )

  const filteredRequests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return requests

    return requests.filter((request) => {
      const searchableValues = [
        request.employeeName,
        request.employeeId,
        formatRequestId(request.id),
        request.requestType,
      ]

      return searchableValues.some((value) =>
        String(value ?? '').toLowerCase().includes(query),
      )
    })
  }, [requests, searchTerm])

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

  const displaySummary = summary ?? calculatedSummary

  return (
    <section className="manager-dashboard">
      <div className="page-title-row manager-dashboard-heading">
        <div>
          <h1>Team Requests</h1>
          <p>Review and approve expense reports from your team.</p>
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

      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search by Employee Name or ID..."
      />

      <div className="card manager-requests-card">
        <div className="manager-requests-card-header">
          <div>
            <h2>Pending Team Requests</h2>
            <p className="muted">Requests currently waiting for manager approval.</p>
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

        {!isLoading && !errorMessage && requests.length > 0 && filteredRequests.length === 0 && (
          <div className="dashboard-state empty-state">
            <strong>No matching requests</strong>
            <span>Try searching by another employee name, ID, or request ID.</span>
          </div>
        )}

        {!isLoading && !errorMessage && filteredRequests.length > 0 && (
          <PendingRequestsList
            requests={filteredRequests}
            onOpenRequest={(request) =>
              navigate(`/manager/requests/${request.id}`, { state: { request } })
            }
          />
        )}
      </div>
    </section>
  )
}

function DashboardSummaryCards({ summary, isLoading }) {
  return (
    <div className="manager-summary-grid" aria-label="Pending requests summary">
      <article className="card manager-summary-card manager-summary-card-blue">
        <span>Pending Approvals</span>
        <strong>{isLoading ? '-' : summary.pendingCount}</strong>
      </article>
      <article className="card manager-summary-card manager-summary-card-indigo">
        <div className="manager-summary-label-row">
          <span>Total Pending Amount</span>
          <span className="needs-attention-badge">Needs Attention</span>
        </div>
        <strong>{isLoading ? '-' : formatCurrency(summary.totalAmount, summary.currency)}</strong>
      </article>
    </div>
  )
}

function PendingRequestsList({ requests, onOpenRequest }) {
  return (
    <div className="manager-request-list">
      {requests.map((request) => (
        <PendingRequestCard
          key={request.id}
          request={request}
          onOpenRequest={onOpenRequest}
        />
      ))}
    </div>
  )
}

function PendingRequestCard({ request, onOpenRequest }) {
  return (
    <button
      className="manager-request-card"
      type="button"
      onClick={() => onOpenRequest(request)}
      aria-label={`Request ${formatRequestId(request.id)} from ${request.employeeName}`}
    >
      <span className="manager-request-avatar" aria-hidden="true">
        {getInitial(request.employeeName)}
      </span>
      <span className="manager-request-main">
        <span className="manager-request-title-row">
          <strong>{request.employeeName}</strong>
          <span>{formatRequestId(request.id)}</span>
        </span>
        <span className="manager-request-subtitle">
          {request.requestType} - Submitted {formatDate(request.createdDate)}
        </span>
      </span>
      <span className="manager-request-side">
        <strong>{formatCurrency(request.amount, request.currency)}</strong>
        <span className="manager-request-arrow" aria-hidden="true">→</span>
      </span>
    </button>
  )
}

function calculateDashboardSummary(requests) {
  return {
    pendingCount: requests.length,
    totalAmount: requests.reduce((total, request) => total + Number(request.amount || 0), 0),
    currency: requests[0]?.currency ?? 'USD',
  }
}

function formatRequestId(id) {
  const rawId = String(id ?? '').trim()
  if (!rawId) return 'REQ-000'
  if (/^REQ-/i.test(rawId)) return rawId.toUpperCase()

  return `REQ-${rawId.replace(/^#/, '').padStart(3, '0')}`
}

function getInitial(name) {
  return String(name ?? 'U').trim().charAt(0).toUpperCase() || 'U'
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

  return new Intl.DateTimeFormat('en-GB').format(date)
}
