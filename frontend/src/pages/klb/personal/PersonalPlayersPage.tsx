import FilterableFactsTable from '../../../components/FilterableFactsTable'

export default function PersonalPlayersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Игроки</h1>
      <FilterableFactsTable mode="personal" />
    </div>
  )
}
