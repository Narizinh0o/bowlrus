import FilterableFactsTable from '../../../components/FilterableFactsTable'

export default function TeamTeamsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Команды</h1>
      <FilterableFactsTable mode="team" />
    </div>
  )
}
