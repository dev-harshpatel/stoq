'use client'

import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { UsersTable } from '@/components/UsersTable'
import { UserDetailsModal } from '@/components/UserDetailsModal'
import { UserProfile } from '@/types/user'
import { Loader } from '@/components/Loader'
import { PaginationControls } from '@/components/PaginationControls'
import { Users, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/use-debounce'
import { usePaginatedReactQuery } from '@/hooks/use-paginated-react-query'
import { usePageParam } from '@/hooks/use-page-param'
import { queryKeys } from '@/lib/query-keys'
import { fetchPaginatedUsers } from '@/lib/supabase/queries'

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const debouncedSearch = useDebounce(searchQuery, 300)

  const [currentPage, setCurrentPage] = usePageParam()
  const queryKey = queryKeys.usersPage(currentPage, debouncedSearch)

  const {
    data: users,
    totalCount,
    totalPages,
    isLoading,
    rangeText,
  } = usePaginatedReactQuery<UserProfile>({
    queryKey,
    fetchFn: (range) => fetchPaginatedUsers(debouncedSearch, range),
    currentPage,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users })
  }

  // Reset to page 1 when search changes
  const prevSearchRef = useRef(debouncedSearch)
  useEffect(() => {
    if (prevSearchRef.current !== debouncedSearch) {
      prevSearchRef.current = debouncedSearch
      setCurrentPage(1)
    }
  }, [debouncedSearch, setCurrentPage])

  // Clamp page if it exceeds totalPages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0 && !isLoading) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages, isLoading, setCurrentPage])

  if (isLoading) {
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
      </div>

      {/* Pagination - Sticky at bottom so it stays visible when scrolling on mobile */}
      <div className="flex-shrink-0 sticky bottom-0 z-10 bg-background border-t border-border -mx-4 lg:-mx-6 px-4 lg:px-6 py-2">
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
