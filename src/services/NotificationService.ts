import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';
import { BillDatabase } from './BillDatabase';
import { LocalizedParser } from './LocalizedParser';
import { Currency } from '../types/Bill';
import * as RNLocalize from 'react-native-localize';

interface NotificationConfig {
  title: string;
  message: string;
  date: Date;
  data?: any;
  actions?: string[];
}

export class NotificationService {
  private static instance: NotificationService;
  private database: BillDatabase;
  private isInitialized = false;

  constructor() {
    this.database = BillDatabase.getInstance();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Notification servisini başlat
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔔 Initializing Notification Service...');

      // Push notification configure
      PushNotification.configure({
        // Bildirim alındığında çağrılır
        onNotification: (notification: any) => {
          console.log('📨 Notification received:', notification);
          
          // Kullanıcı bildirime tıklarsa
          if (notification.userInteraction) {
            this.handleNotificationTap(notification);
          }
        },

        // Registration token alındığında
        onRegistrationError: (err: any) => {
          console.error('❌ Notification registration error:', err);
        },

        // İzin isteme
        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },

        // Android-specific
        popInitialNotification: true,
        requestPermissions: Platform.OS === 'ios',
      });

      // Kanal oluştur (Android 8.0+)
      if (Platform.OS === 'android') {
        PushNotification.createChannel({
          channelId: 'bill-reminders',
          channelName: 'Bill Reminders',
          channelDescription: 'Notifications for upcoming bill due dates',
          playSound: true,
          soundName: 'default',
          importance: 4, // HIGH
          vibrate: true,
        });

        PushNotification.createChannel({
          channelId: 'overdue-bills',
          channelName: 'Overdue Bills',
          channelDescription: 'Notifications for overdue bills',
          playSound: true,
          soundName: 'default',
          importance: 4, // HIGH
          vibrate: true,
        });
      }

      this.isInitialized = true;
      console.log('✅ Notification Service initialized');

      // Pending notification'ları kontrol et
      await this.processPendingNotifications();

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize notifications:', error);
      return false;
    }
  }

  /**
   * Fatura için bildirim schedule et
   */
  async scheduleBillReminders(billId: string, dueDate: Date, billData: {
    company?: string;
    amount?: { value: number; currency: Currency };
    type: string;
  }): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        console.warn('⚠️ Notification service not initialized');
        return false;
      }

      console.log(`📅 Scheduling reminders for bill: ${billId}`);

      const reminders = [
        { days: 7, type: 'due_7' },
        { days: 3, type: 'due_3' },
        { days: 1, type: 'due_1' },
        { days: 0, type: 'due_today' }
      ];

      for (const reminder of reminders) {
        const notificationDate = new Date(dueDate);
        notificationDate.setDate(dueDate.getDate() - reminder.days);

        // Geçmiş tarihler için bildirim oluşturma
        if (notificationDate < new Date()) {
          continue;
        }

        const notification = this.createNotificationConfig(
          reminder.type as any,
          billData,
          dueDate
        );

        // Unique ID oluştur
        const notificationId = parseInt(`${billId.slice(-6)}${reminder.days}`.replace(/\D/g, '')) || Math.floor(Math.random() * 10000);

        PushNotification.localNotificationSchedule({
          id: notificationId,
          channelId: 'bill-reminders',
          title: notification.title,
          message: notification.message,
          date: notificationDate,
          soundName: 'default',
          vibrate: true,
          vibration: 300,
          playSound: true,
          actions: ['Mark as Paid', 'View Bill'],
          userInfo: {
            billId,
            notificationType: reminder.type,
            dueDate: dueDate.toISOString(),
          },
        });

        console.log(`🔔 Scheduled ${reminder.type} notification for ${notificationDate.toISOString()}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to schedule bill reminders:', error);
      return false;
    }
  }

  /**
   * Vadesi geçmiş faturalar için acil bildirim gönder
   */
  async sendOverdueNotification(bills: Array<{
    id: string;
    company?: string;
    amount?: { value: number; currency: Currency };
    type: string;
    dueDate?: Date;
  }>): Promise<void> {
    try {
      if (bills.length === 0) return;

      const locale = RNLocalize.getLocales()[0]?.languageCode || 'en';
      
      let title = 'Overdue Bills!';
      let message = `You have ${bills.length} overdue bill(s)`;

      // Dil bazlı mesajlar
      if (locale === 'tr') {
        title = 'Vadesi Geçmiş Faturalar!';
        message = `${bills.length} adet vadesi geçmiş faturanız var`;
      } else if (locale === 'de') {
        title = 'Überfällige Rechnungen!';
        message = `Sie haben ${bills.length} überfällige Rechnung(en)`;
      }

      // İlk faturanın detaylarını ekle
      if (bills.length === 1) {
        const bill = bills[0];
        const amount = bill.amount ? 
          LocalizedParser.formatCurrency(bill.amount.value, bill.amount.currency) : '';
        
        if (locale === 'tr') {
          message = `${bill.company || 'Şirket'} faturanız vadesi geçti${amount ? ` (${amount})` : ''}`;
        } else if (locale === 'de') {
          message = `Ihre ${bill.company || 'Firma'} Rechnung ist überfällig${amount ? ` (${amount})` : ''}`;
        } else {
          message = `Your ${bill.company || 'company'} bill is overdue${amount ? ` (${amount})` : ''}`;
        }
      }

      PushNotification.localNotification({
        channelId: 'overdue-bills',
        title,
        message,
        soundName: 'default',
        vibrate: true,
        vibration: 500,
        playSound: true,
        priority: 'max',
        importance: 'high',
        actions: ['View Overdue Bills'],
        userInfo: {
          type: 'overdue_bills',
          billIds: bills.map(b => b.id),
        },
      });

      console.log(`🚨 Sent overdue notification for ${bills.length} bills`);
    } catch (error) {
      console.error('❌ Failed to send overdue notification:', error);
    }
  }

  /**
   * Pending notification'ları kontrol et ve gönder
   */
  async processPendingNotifications(): Promise<void> {
    try {
      const result = await this.database.getPendingNotifications();
      
      if (!result.success || !result.data) {
        return;
      }

      const pendingNotifications = result.data;
      console.log(`📋 Processing ${pendingNotifications.length} pending notifications`);

      for (const notification of pendingNotifications) {
        // Bildirim gönder
        const config = this.createNotificationConfig(
          notification.notification_type,
          {
            company: notification.company,
            amount: notification.amount_value ? {
              value: notification.amount_value,
              currency: notification.amount_currency as Currency
            } : undefined,
            type: notification.type
          },
          new Date(notification.scheduled_date)
        );

        PushNotification.localNotification({
          channelId: 'bill-reminders',
          title: config.title,
          message: config.message,
          soundName: 'default',
          vibrate: true,
          playSound: true,
          userInfo: {
            billId: notification.bill_id,
            notificationType: notification.notification_type,
          },
        });

        // Gönderildi olarak işaretle
        await this.database.markNotificationAsSent(notification.id);
      }
    } catch (error) {
      console.error('❌ Failed to process pending notifications:', error);
    }
  }

  /**
   * Bildirim içeriği oluştur
   */
  private createNotificationConfig(
    type: 'due_7' | 'due_3' | 'due_1' | 'due_today' | 'overdue',
    billData: {
      company?: string;
      amount?: { value: number; currency: Currency };
      type: string;
    },
    dueDate: Date
  ): NotificationConfig {
    const locale = RNLocalize.getLocales()[0]?.languageCode || 'en';
    const company = billData.company || 'Your bill';
    const amount = billData.amount ? 
      LocalizedParser.formatCurrency(billData.amount.value, billData.amount.currency) : '';

    // Türkçe mesajlar
    if (locale === 'tr') {
      const messages = {
        due_7: {
          title: '📅 Fatura Hatırlatması - 7 Gün Kaldı',
          message: `${company} faturanızın son ödeme tarihi 7 gün sonra${amount ? ` (${amount})` : ''}`
        },
        due_3: {
          title: '⚠️ Fatura Hatırlatması - 3 Gün Kaldı',
          message: `${company} faturanızın son ödeme tarihi 3 gün sonra${amount ? ` (${amount})` : ''}`
        },
        due_1: {
          title: '🚨 Fatura Hatırlatması - 1 Gün Kaldı',
          message: `${company} faturanızın son ödeme tarihi yarın${amount ? ` (${amount})` : ''}`
        },
        due_today: {
          title: '🔴 Fatura Hatırlatması - BUGÜN!',
          message: `${company} faturanızın son ödeme tarihi bugün${amount ? ` (${amount})` : ''}`
        },
        overdue: {
          title: '💥 Vadesi Geçmiş Fatura!',
          message: `${company} faturanızın vadesi geçti${amount ? ` (${amount})` : ''}`
        }
      };
      return {
        title: messages[type].title,
        message: messages[type].message,
        date: dueDate
      };
    }

    // Almanca mesajlar
    else if (locale === 'de') {
      const messages = {
        due_7: {
          title: '📅 Rechnungserinnerung - 7 Tage',
          message: `Ihre ${company} Rechnung ist in 7 Tagen fällig${amount ? ` (${amount})` : ''}`
        },
        due_3: {
          title: '⚠️ Rechnungserinnerung - 3 Tage',
          message: `Ihre ${company} Rechnung ist in 3 Tagen fällig${amount ? ` (${amount})` : ''}`
        },
        due_1: {
          title: '🚨 Rechnungserinnerung - 1 Tag',
          message: `Ihre ${company} Rechnung ist morgen fällig${amount ? ` (${amount})` : ''}`
        },
        due_today: {
          title: '🔴 Rechnungserinnerung - HEUTE!',
          message: `Ihre ${company} Rechnung ist heute fällig${amount ? ` (${amount})` : ''}`
        },
        overdue: {
          title: '💥 Überfällige Rechnung!',
          message: `Ihre ${company} Rechnung ist überfällig${amount ? ` (${amount})` : ''}`
        }
      };
      return {
        title: messages[type].title,
        message: messages[type].message,
        date: dueDate
      };
    }

    // İngilizce mesajlar (varsayılan)
    else {
      const messages = {
        due_7: {
          title: '📅 Bill Reminder - 7 Days Left',
          message: `Your ${company} bill is due in 7 days${amount ? ` (${amount})` : ''}`
        },
        due_3: {
          title: '⚠️ Bill Reminder - 3 Days Left',
          message: `Your ${company} bill is due in 3 days${amount ? ` (${amount})` : ''}`
        },
        due_1: {
          title: '🚨 Bill Reminder - 1 Day Left',
          message: `Your ${company} bill is due tomorrow${amount ? ` (${amount})` : ''}`
        },
        due_today: {
          title: '🔴 Bill Reminder - DUE TODAY!',
          message: `Your ${company} bill is due today${amount ? ` (${amount})` : ''}`
        },
        overdue: {
          title: '💥 Overdue Bill!',
          message: `Your ${company} bill is overdue${amount ? ` (${amount})` : ''}`
        }
      };
      return {
        title: messages[type].title,
        message: messages[type].message,
        date: dueDate
      };
    }
  }

  /**
   * Bildirime tıklandığında çağrılır
   */
  private handleNotificationTap(notification: any): void {
    console.log('👆 Notification tapped:', notification.userInfo);
    
    // Burada navigation logic eklenebilir
    // Örneğin: specific bill'e git, overdue bills listesi göster, vs.
  }

  /**
   * Fatura ödemesi yapıldığında bildirimlerini iptal et
   */
  async cancelBillNotifications(billId: string): Promise<void> {
    try {
      // Tüm scheduled notification'ları iptal et
      PushNotification.getScheduledLocalNotifications((notifications) => {
        notifications.forEach((notification) => {
          if (notification.userInfo?.billId === billId) {
            PushNotification.cancelLocalNotification(notification.id);
            console.log(`🚫 Cancelled notification for bill: ${billId}`);
          }
        });
      });
    } catch (error) {
      console.error('❌ Failed to cancel notifications:', error);
    }
  }

  /**
   * App startup'ta vadesi geçmiş faturaları kontrol et
   */
  async checkForOverdueBills(): Promise<void> {
    try {
      const result = await this.database.getOverdueBills();
      
      if (result.success && result.data && result.data.length > 0) {
        console.log(`🚨 Found ${result.data.length} overdue bills`);
        await this.sendOverdueNotification(result.data);
      }
    } catch (error) {
      console.error('❌ Failed to check overdue bills:', error);
    }
  }

  /**
   * Notification ayarlarını kontrol et
   */
  async checkNotificationPermissions(): Promise<boolean> {
    return new Promise((resolve) => {
      PushNotification.checkPermissions((permissions) => {
        const hasPermissions = permissions.alert && permissions.badge;
        console.log('🔔 Notification permissions:', permissions);
        resolve(hasPermissions);
      });
    });
  }

  /**
   * Badge sayısını güncelle (iOS)
   */
  async updateBadgeCount(): Promise<void> {
    try {
      const overdueResult = await this.database.getOverdueBills();
      const upcomingResult = await this.database.getUpcomingBills(3);
      
      const overdueCount = overdueResult.success ? overdueResult.data?.length || 0 : 0;
      const upcomingCount = upcomingResult.success ? upcomingResult.data?.length || 0 : 0;
      
      const badgeCount = overdueCount + upcomingCount;
      
      if (Platform.OS === 'ios') {
        PushNotification.setApplicationIconBadgeNumber(badgeCount);
      }
      
      console.log(`📱 Badge count updated: ${badgeCount}`);
    } catch (error) {
      console.error('❌ Failed to update badge count:', error);
    }
  }

  /**
   * Tüm notification'ları temizle (DEBUG)
   */
  clearAllNotifications(): void {
    PushNotification.cancelAllLocalNotifications();
    if (Platform.OS === 'ios') {
      PushNotification.setApplicationIconBadgeNumber(0);
    }
    console.log('🧹 All notifications cleared');
  }
} 