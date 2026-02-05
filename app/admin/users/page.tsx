'use client'

import { useState, useCallback } from 'react'
import { UsersTable } from '@/components/UsersTable'
import { UserDetailsModal } from '@/components/UserDetailsModal'
import { UserProfile } from '@/types/user'
import { Loader } from '@/components/Loader'
import { PaginationControls } from '@/components/PaginationControls'
import { Users, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/use-debounce'
import { usePaginatedQuery } from '@/hooks/use-paginated-query'
import { fetchPaginatedUsers } from '@/lib/supabase/queries'

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const debouncedSearch = useDebounce(searchQuery, 300)

  const fetchFn = useCallback(
    async (range: { from: number; to: number }) => {
      return fetchPaginatedUsers(debouncedSearch, range)
    },
    [debouncedSearch]
  )

  const {
    data: users,
    totalCount,
    currentPage,
    totalPages,
    isLoading,
    setCurrentPage,
    refresh,
    rangeText,
  } = usePaginatedQuery<UserProfile>({
    fetchFn,
    dependencies: [debouncedSearch],
    realtimeTable: 'user_profiles',
  })

  if (isLoading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader size="lg" text="Loading users..." />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-10 bg-background pb-4 space-y-4 border-b border-border mb-4 -mx-4 lg:-mx-6 px-4 lg:px-6 pt-4 lg:pt-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6" />
              Users
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {totalCount} {totalCount === 1 ? 'user' : 'users'}
              {searchQuery ? ` found` : ` registered`}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name, email, business, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background border-border"
          />
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 -mx-4 lg:-mx-6 px-4 lg:px-6">
        <UsersTable
          users={users}
          onReviewUser={(user) => {
            setSelectedUser(user)
            setIsModalOpen(true)
          }}
        />
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          rangeText={rangeText}
        />
      </div>

      {/* User Details Modal */}
      <UserDetailsModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        user={selectedUser}
        onStatusUpdate={() => {
          refresh()
        }}
      />
    </div>
  )
}
