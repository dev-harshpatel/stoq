import { UserProfile, ApprovalStatus } from '@/types/user'
import { updateUserProfileApprovalStatus } from '@/lib/supabase/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cn, formatDateTimeInOntario } from '@/lib/utils'
import { useState } from 'react'
import { Loader2, CheckCircle2, XCircle, User, Building2, Mail, Phone, MapPin, Globe, Calendar } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface UserDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserProfile | null
  onStatusUpdate?: () => void
}

const getStatusColor = (status: ApprovalStatus) => {
  switch (status) {
    case 'pending':
      return 'bg-warning/10 text-warning border-warning/20'
    case 'approved':
      return 'bg-success/10 text-success border-success/20'
    case 'rejected':
      return 'bg-destructive/10 text-destructive border-destructive/20'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

const getStatusLabel = (status: ApprovalStatus) => {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    default:
      return status
  }
}

export const UserDetailsModal = ({
  open,
  onOpenChange,
  user,
  onStatusUpdate,
}: UserDetailsModalProps) => {
  const { toast } = useToast()
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [showConfirmApprove, setShowConfirmApprove] = useState(false)
  const [showConfirmReject, setShowConfirmReject] = useState(false)

  if (!user) return null

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await updateUserProfileApprovalStatus(user.userId, 'approved')
      
      toast({
        title: 'Profile approved',
        description: `User profile has been approved. They can now place orders.`,
      })
      
      setShowConfirmApprove(false)
      onStatusUpdate?.()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve profile. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    try {
      await updateUserProfileApprovalStatus(user.userId, 'rejected')
      
      toast({
        title: 'Profile rejected',
        description: `User profile has been rejected.`,
      })
      
      setShowConfirmReject(false)
      onStatusUpdate?.()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject profile. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsRejecting(false)
    }
  }

  const canApprove = user.approvalStatus === 'pending' || user.approvalStatus === 'rejected'
  const canReject = user.approvalStatus === 'pending' || user.approvalStatus === 'approved'

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'N/A'
  const location = [user.businessCity, user.businessState, user.businessCountry]
    .filter(Boolean)
    .join(', ') || 'N/A'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between pr-8">
              <div>
                <DialogTitle>User Profile Review</DialogTitle>
                <DialogDescription>
                  Review user details and approve or reject their profile
                </DialogDescription>
              </div>
              <Badge
                variant="outline"
                className={cn('text-sm flex-shrink-0', getStatusColor(user.approvalStatus))}
              >
                {getStatusLabel(user.approvalStatus)}
              </Badge>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="personal">Personal Information</TabsTrigger>
                <TabsTrigger value="business">Business Information</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Full Name</span>
                      </div>
                      <p className="font-medium text-foreground">{fullName}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>Phone</span>
                      </div>
                      <p className="font-medium text-foreground">{user.phone || 'N/A'}</p>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>User ID</span>
                      </div>
                      <p className="font-medium text-foreground font-mono text-xs">
                        {user.userId}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Joined</span>
                      </div>
                      <p className="font-medium text-foreground">
                        {formatDateTimeInOntario(user.createdAt)}
                      </p>
                    </div>

                    {user.approvalStatusUpdatedAt && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Status Updated</span>
                        </div>
                        <p className="font-medium text-foreground">
                          {formatDateTimeInOntario(user.approvalStatusUpdatedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="business" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 md:col-span-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span>Business Name</span>
                      </div>
                      <p className="font-medium text-foreground">{user.businessName || 'N/A'}</p>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>Business Address</span>
                      </div>
                      <p className="font-medium text-foreground">{user.businessAddress || 'N/A'}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>City</span>
                      </div>
                      <p className="font-medium text-foreground">{user.businessCity || 'N/A'}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>State/Province</span>
                      </div>
                      <p className="font-medium text-foreground">{user.businessState || 'N/A'}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>Country</span>
                      </div>
                      <p className="font-medium text-foreground">{user.businessCountry || 'N/A'}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Years in Business</span>
                      </div>
                      <p className="font-medium text-foreground">
                        {user.businessYears !== null && user.businessYears !== undefined
                          ? `${user.businessYears} years`
                          : 'N/A'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>Business Email</span>
                      </div>
                      <p className="font-medium text-foreground">{user.businessEmail || 'N/A'}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        <span>Website</span>
                      </div>
                      <p className="font-medium text-foreground">
                        {user.businessWebsite ? (
                          <a
                            href={user.businessWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {user.businessWebsite}
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isApproving || isRejecting}
            >
              Close
            </Button>
            {canReject && (
              <Button
                variant="destructive"
                onClick={() => setShowConfirmReject(true)}
                disabled={isApproving || isRejecting}
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject Profile
                  </>
                )}
              </Button>
            )}
            {canApprove && (
              <Button
                onClick={() => setShowConfirmApprove(true)}
                disabled={isApproving || isRejecting}
              >
                {isApproving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve Profile
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialogs */}
      {showConfirmApprove && (
        <Dialog open={showConfirmApprove} onOpenChange={setShowConfirmApprove}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Profile</DialogTitle>
              <DialogDescription>
                Are you sure you want to approve this user profile? They will be able to place orders once approved.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmApprove(false)}
                disabled={isApproving}
              >
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={isApproving}>
                {isApproving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  'Approve'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showConfirmReject && (
        <Dialog open={showConfirmReject} onOpenChange={setShowConfirmReject}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Profile</DialogTitle>
              <DialogDescription>
                Are you sure you want to reject this user profile? They will not be able to place orders.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmReject(false)}
                disabled={isRejecting}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={isRejecting}>
                {isRejecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  'Reject'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
