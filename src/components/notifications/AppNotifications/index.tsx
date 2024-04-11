import { Fragment, createContext, useContext, useEffect, useRef, useState } from 'react'

import { useSubscription } from '@web3inbox/react'
import { AnimatePresence } from 'framer-motion'
import { motion } from 'framer-motion'
import { useParams } from 'react-router-dom'

import Label from '@/components/general/Label'
import MobileHeader from '@/components/layout/MobileHeader'
import AppNotificationItemSkeleton from '@/components/notifications/AppNotifications/AppNotificationItemSkeleton'
import W3iContext from '@/contexts/W3iContext/context'
import { useNotificationsInfiniteScroll } from '@/utils/hooks/useNotificationsInfiniteScroll'

import AppNotificationItem from './AppNotificationItem'
import AppNotificationsCardMobile from './AppNotificationsCardMobile'
import AppNotificationsEmpty from './AppNotificationsEmpty'
import AppNotificationsHeader from './AppNotificationsHeader'

import './AppNotifications.scss'

export interface AppNotificationsDragProps {
  id: string
  isDragged: boolean
}

export type AppNotificationsDragContext = [
  AppNotificationsDragProps[] | undefined,
  React.Dispatch<React.SetStateAction<AppNotificationsDragProps[] | undefined>>
]

export const AppNotificationDragContext = createContext<AppNotificationsDragContext>([
  [],
  () => null
])

const AppNotifications = () => {
  const { userPubkey } = useContext(W3iContext)
  const { domain } = useParams<{ domain: string }>()

  const { data: subscription } = useSubscription(undefined, domain)

  const { isLoading, notifications, intersectionObserverRef, nextPage } =
    useNotificationsInfiniteScroll(userPubkey, domain)

  const ref = useRef<HTMLDivElement>(null)

  const [notificationsDrag, setNotificationsDrag] = useState<
    AppNotificationsDragProps[] | undefined
  >()

  const [notificationsWrapper, setNotificationsWrapper] = useState<{
    unreadNotifications: Exclude<typeof notifications, null>
    notifications: Exclude<typeof notifications, null>
  }>({
    unreadNotifications: [],
    notifications: []
  })

  useEffect(() => {
    setNotificationsWrapper({
      unreadNotifications: [],
      notifications: []
    })
  }, [domain])

  useEffect(() => {
    setNotificationsWrapper(({ unreadNotifications: currentUnread }) => {
      const newUnreadToAdd: typeof currentUnread = []
      notifications?.forEach(notification => {
        const wasPreviouslyUnreadInView = currentUnread.some(
          unreadNotification => unreadNotification.id === notification.id
        )

        if (wasPreviouslyUnreadInView) {
          if (notification.isRead) {
            // No need to guard this in an `if` as it is guaranteed to be valid because of the above `some` check.
            const id = currentUnread.findIndex(
              previouslyUnreadNotification => previouslyUnreadNotification.id === notification.id
            )
            currentUnread[id].isRead = true
          }
          return
        }

        if (!notification.isRead) {
          newUnreadToAdd.push(notification)
        }
      })
      const newUnreadNotifications = [...currentUnread, ...newUnreadToAdd]
      return {
        unreadNotifications: newUnreadNotifications,
        notifications:
          notifications?.filter(
            notification =>
              !newUnreadNotifications.some(
                unreadNotification => unreadNotification.id === notification.id
              )
          ) ?? []
      }
    })
  }, [notifications])

  const onlyUnreadNotificationsVisible =
    notificationsWrapper.unreadNotifications.length === notifications?.length

  return subscription?.metadata ? (
    <AppNotificationDragContext.Provider value={[notificationsDrag, setNotificationsDrag]}>
      <AnimatePresence>
        <motion.div
          ref={ref}
          className="AppNotifications PageContainer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.33 }}
        >
          <div className="AppNotifications__border"></div>
          <AppNotificationsHeader
            id={subscription.metadata.appDomain}
            name={subscription.metadata.name}
            logo={subscription.metadata?.icons?.[0]}
            domain={subscription.metadata.appDomain}
          />
          <MobileHeader
            back="/notifications"
            notificationId={subscription.metadata.appDomain}
            title={subscription.metadata.name}
          />
          <AppNotificationsCardMobile />
          {isLoading || notifications?.length ? (
            <>
              <div className="AppNotifications__list">
                <div className="AppNotifications__list__content">
                  {!isLoading && notificationsWrapper?.unreadNotifications.length ? (
                    <Label color="accent">Unread</Label>
                  ) : null}
                  {notificationsWrapper?.unreadNotifications.length
                    ? notificationsWrapper.unreadNotifications.map((notification, index) => (
                        <AppNotificationItem
                          ref={
                            index === notificationsWrapper.unreadNotifications.length - 1 &&
                            onlyUnreadNotificationsVisible
                              ? intersectionObserverRef
                              : null
                          }
                          key={notification.id}
                          onClear={nextPage}
                          notification={{
                            timestamp: notification.sentAt,
                            // We do not manage read status for now.
                            isRead: notification.isRead,
                            read: notification.read,
                            id: notification.id.toString(),
                            message: notification.body,
                            title: notification.title,
                            image: notification.type
                              ? subscription?.scope[notification.type]?.imageUrls?.md
                              : undefined,
                            url: notification.url
                          }}
                          appLogo={subscription.metadata?.icons?.[0]}
                        />
                      ))
                    : null}
                </div>
                <div className="AppNotifications__list__content">
                  {!isLoading &&
                  notificationsWrapper.notifications?.length &&
                  !onlyUnreadNotificationsVisible ? (
                    <Label color="main">Latest</Label>
                  ) : null}
                  {notificationsWrapper.notifications?.length && !onlyUnreadNotificationsVisible
                    ? notificationsWrapper.notifications.map((notification, index) => (
                        <AppNotificationItem
                          ref={
                            index === notificationsWrapper.notifications.length - 1 &&
                            !onlyUnreadNotificationsVisible
                              ? intersectionObserverRef
                              : null
                          }
                          key={notification.id}
                          onClear={nextPage}
                          notification={{
                            timestamp: notification.sentAt,
                            // We do not manage read status for now.
                            isRead: notification.isRead,
                            read: notification.read,
                            id: notification.id.toString(),
                            message: notification.body,
                            title: notification.title,
                            image: notification.type
                              ? subscription?.scope[notification.type]?.imageUrls?.md
                              : undefined,
                            url: notification.url
                          }}
                          appLogo={subscription.metadata?.icons?.[0]}
                        />
                      ))
                    : null}
                  {isLoading && !notifications?.length ? (
                    <Fragment>
                      <AppNotificationItemSkeleton />
                      <AppNotificationItemSkeleton />
                      <AppNotificationItemSkeleton />
                    </Fragment>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <AppNotificationsEmpty
              icon={subscription.metadata?.icons?.[0]}
              name={subscription.metadata.name}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </AppNotificationDragContext.Provider>
  ) : null
}

export default AppNotifications
