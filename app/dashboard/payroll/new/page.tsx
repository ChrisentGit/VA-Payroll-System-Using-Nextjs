import CreatePeriodForm from '@/components/payroll/CreatePeriodForm'

export default function NewPayrollPeriodPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">New Payroll Period</h1>
      <CreatePeriodForm />
    </div>
  )
}