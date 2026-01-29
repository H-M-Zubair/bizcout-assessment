import { render, screen } from '@testing-library/react'
import { StatsCards } from '@/components/StatsCards'
import { Statistics } from '@/types'

describe('StatsCards', () => {
  const mockStats: Statistics = {
    totalRequests: 1250,
    averageResponseTime: 245,
    successRate: 98,
    statusCodeDistribution: {
      200: 1225,
      404: 15,
      500: 10
    }
  }

  it('renders all stat cards', () => {
    render(<StatsCards stats={mockStats} />)
    
    expect(screen.getByText('Total Requests')).toBeInTheDocument()
    expect(screen.getByText('Avg Response Time')).toBeInTheDocument()
    expect(screen.getByText('Success Rate')).toBeInTheDocument()
    expect(screen.getByText('Error Rate')).toBeInTheDocument()
  })

  it('displays correct values', () => {
    render(<StatsCards stats={mockStats} />)
    
    expect(screen.getByText('1,250')).toBeInTheDocument()
    expect(screen.getByText('245ms')).toBeInTheDocument()
    expect(screen.getByText('98%')).toBeInTheDocument()
    expect(screen.getByText('2%')).toBeInTheDocument()
  })

  it('displays change indicators', () => {
    render(<StatsCards stats={mockStats} />)
    
    expect(screen.getByText('+12%')).toBeInTheDocument()
    expect(screen.getByText('-8%')).toBeInTheDocument()
    expect(screen.getAllByText('+2%')).toHaveLength(2)
    expect(screen.getByText('-2%')).toBeInTheDocument()
  })

  it('shows "from last period" text for all cards', () => {
    render(<StatsCards stats={mockStats} />)
    
    const periodTexts = screen.getAllByText('from last period')
    expect(periodTexts).toHaveLength(4)
  })

  it('handles zero values correctly', () => {
    const zeroStats: Statistics = {
      totalRequests: 0,
      averageResponseTime: 0,
      successRate: 0,
      statusCodeDistribution: {}
    }
    
    render(<StatsCards stats={zeroStats} />)
    
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('0ms')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getAllByText('0%')).toHaveLength(2) // Success rate and error rate
  })

  it('has proper accessibility structure', () => {
    render(<StatsCards stats={mockStats} />)
    
    // Check that all cards have proper heading structure
    const headings = screen.getAllByRole('heading', { level: undefined })
    expect(headings.length).toBeGreaterThan(0)
    
    // Check that values are properly displayed
    const totalRequests = screen.getByText('1,250')
    expect(totalRequests).toHaveClass('text-2xl')
  })
})
