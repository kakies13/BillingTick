import SQLite from 'react-native-sqlite-storage';
import { BillData, InvoiceType, Currency, Country } from '../types/Bill';

// SQLite debug modunu aç
SQLite.DEBUG(true);
SQLite.enablePromise(true);

interface DatabaseResult {
  success: boolean;
  data?: any;
  error?: string;
}

interface BillQuery {
  type?: InvoiceType;
  dateRange?: {
    start: Date;
    end: Date;
  };
  amountRange?: {
    min: number;
    max: number;
  };
  currency?: Currency;
  company?: string;
  paid?: boolean;
  overdue?: boolean;
  limit?: number;
  offset?: number;
}

interface NotificationRecord {
  id: number;
  billId: string;
  notificationType: 'due_7' | 'due_3' | 'due_1' | 'due_today' | 'overdue';
  scheduledDate: Date;
  sent: boolean;
  createdAt: Date;
}

export class BillDatabase {
  private static instance: BillDatabase;
  private db: SQLite.SQLiteDatabase | null = null;

  // Singleton pattern
  static getInstance(): BillDatabase {
    if (!BillDatabase.instance) {
      BillDatabase.instance = new BillDatabase();
    }
    return BillDatabase.instance;
  }

  /**
   * Veritabanını başlat ve tabloları oluştur
   */
  async initialize(): Promise<DatabaseResult> {
    try {
      console.log('🗄️ Initializing Bill Database...');
      
      this.db = await SQLite.openDatabase(
        { name: 'bills.db', location: 'default' },
        () => console.log('✅ Database opened successfully'),
        (error: any) => console.error('❌ Database error:', error)
      );

      await this.createTables();
      
      console.log('✅ Database initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Tabloları oluştur
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Bills tablosu
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        amount_value REAL,
        amount_currency TEXT,
        amount_raw TEXT,
        due_date TEXT,
        due_date_raw TEXT,
        due_date_format TEXT,
        company TEXT,
        account_number TEXT,
        confidence REAL NOT NULL,
        ocr_text TEXT NOT NULL,
        image_uri TEXT NOT NULL,
        image_thumbnail TEXT,
        image_optimized TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        paid BOOLEAN DEFAULT 0,
        paid_date TEXT,
        notes TEXT,
        category TEXT,
        tags TEXT,
        reminder_enabled BOOLEAN DEFAULT 1,
        archived BOOLEAN DEFAULT 0
      )
    `);

    // Notifications tablosu
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_id TEXT NOT NULL,
        notification_type TEXT NOT NULL,
        scheduled_date TEXT NOT NULL,
        sent BOOLEAN DEFAULT 0,
        sent_date TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(bill_id) REFERENCES bills(id) ON DELETE CASCADE
      )
    `);

    // Categories tablosu (custom kategoriler için)
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        color TEXT,
        icon TEXT,
        created_at TEXT NOT NULL
      )
    `);

    // Settings tablosu
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // İndeksler oluştur (performans için)
    await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_bills_type ON bills(type)');
    await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date)');
    await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_bills_company ON bills(company)');
    await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_bills_paid ON bills(paid)');
    await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at)');
    
    console.log('✅ Database tables created successfully');
  }

  /**
   * Fatura kaydet
   */
  async saveBill(billData: BillData, imageData?: {
    thumbnail?: string;
    optimized?: string;
  }): Promise<DatabaseResult> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      console.log(`💾 Saving bill: ${billData.id}`);

      await this.db.executeSql(`
        INSERT OR REPLACE INTO bills (
          id, type, amount_value, amount_currency, amount_raw,
          due_date, due_date_raw, due_date_format,
          company, account_number, confidence, ocr_text,
          image_uri, image_thumbnail, image_optimized,
          created_at, updated_at, paid, reminder_enabled, archived
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        billData.id,
        billData.type,
        billData.amount?.value || null,
        billData.amount?.currency || null,
        billData.amount?.raw || null,
        billData.dueDate?.date?.toISOString() || null,
        billData.dueDate?.raw || null,
        billData.dueDate?.format || null,
        billData.company || null,
        billData.accountNumber || null,
        billData.confidence,
        billData.ocrText,
        billData.imageUri,
        imageData?.thumbnail || null,
        imageData?.optimized || null,
        billData.createdAt.toISOString(),
        new Date().toISOString(),
        0, // paid default false
        1, // reminder_enabled default true
        0  // archived default false
      ]);

      // Eğer son ödeme tarihi varsa, notification'ları schedule et
      if (billData.dueDate?.date) {
        await this.scheduleNotifications(billData.id, billData.dueDate.date);
      }

      console.log('✅ Bill saved successfully');
      return { success: true, data: { id: billData.id } };
    } catch (error) {
      console.error('❌ Failed to save bill:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Fatura getir (ID ile)
   */
  async getBill(id: string): Promise<DatabaseResult> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      const [result] = await this.db.executeSql(
        'SELECT * FROM bills WHERE id = ?',
        [id]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'Bill not found' };
      }

      const bill = this.mapRowToBillData(result.rows.item(0));
      return { success: true, data: bill };
    } catch (error) {
      console.error('❌ Failed to get bill:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Faturaları sorgula (gelişmiş filtreleme)
   */
  async queryBills(query: BillQuery = {}): Promise<DatabaseResult> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      let sql = 'SELECT * FROM bills WHERE archived = 0';
      const params: any[] = [];

      // Filtreleri uygula
      if (query.type) {
        sql += ' AND type = ?';
        params.push(query.type);
      }

      if (query.dateRange) {
        sql += ' AND due_date BETWEEN ? AND ?';
        params.push(
          query.dateRange.start.toISOString(),
          query.dateRange.end.toISOString()
        );
      }

      if (query.amountRange) {
        sql += ' AND amount_value BETWEEN ? AND ?';
        params.push(query.amountRange.min, query.amountRange.max);
      }

      if (query.currency) {
        sql += ' AND amount_currency = ?';
        params.push(query.currency);
      }

      if (query.company) {
        sql += ' AND company LIKE ?';
        params.push(`%${query.company}%`);
      }

      if (query.paid !== undefined) {
        sql += ' AND paid = ?';
        params.push(query.paid ? 1 : 0);
      }

      if (query.overdue) {
        sql += ' AND due_date < ? AND paid = 0';
        params.push(new Date().toISOString());
      }

      // Sıralama ve limit
      sql += ' ORDER BY created_at DESC';
      
      if (query.limit) {
        sql += ' LIMIT ?';
        params.push(query.limit);
      }

      if (query.offset) {
        sql += ' OFFSET ?';
        params.push(query.offset);
      }

      const [result] = await this.db.executeSql(sql, params);
      
      const bills = [];
      for (let i = 0; i < result.rows.length; i++) {
        bills.push(this.mapRowToBillData(result.rows.item(i)));
      }

      console.log(`📋 Found ${bills.length} bills`);
      return { success: true, data: bills };
    } catch (error) {
      console.error('❌ Failed to query bills:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Vadesi gelmiş faturaları getir
   */
  async getOverdueBills(): Promise<DatabaseResult> {
    const today = new Date();
    return this.queryBills({
      overdue: true,
      paid: false
    });
  }

  /**
   * Önümüzdeki X gün içinde vadesi gelecek faturaları getir
   */
  async getUpcomingBills(days: number = 7): Promise<DatabaseResult> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return this.queryBills({
      dateRange: {
        start: today,
        end: futureDate
      },
      paid: false
    });
  }

  /**
   * Fatura durumunu güncelle (ödendi/ödenmedi)
   */
  async updateBillPaymentStatus(id: string, paid: boolean): Promise<DatabaseResult> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      await this.db.executeSql(`
        UPDATE bills 
        SET paid = ?, paid_date = ?, updated_at = ?
        WHERE id = ?
      `, [
        paid ? 1 : 0,
        paid ? new Date().toISOString() : null,
        new Date().toISOString(),
        id
      ]);

      // Eğer ödendi ise, pending notification'ları cancel et
      if (paid) {
        await this.cancelNotifications(id);
      }

      console.log(`✅ Bill payment status updated: ${id} = ${paid}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to update payment status:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Notification'ları schedule et
   */
  private async scheduleNotifications(billId: string, dueDate: Date): Promise<void> {
    if (!this.db) return;

    const notifications = [
      { type: 'due_7', days: 7 },
      { type: 'due_3', days: 3 },
      { type: 'due_1', days: 1 },
      { type: 'due_today', days: 0 }
    ];

    for (const notif of notifications) {
      const scheduledDate = new Date(dueDate);
      scheduledDate.setDate(dueDate.getDate() - notif.days);

      await this.db.executeSql(`
        INSERT OR REPLACE INTO notifications (
          bill_id, notification_type, scheduled_date, created_at
        ) VALUES (?, ?, ?, ?)
      `, [
        billId,
        notif.type,
        scheduledDate.toISOString(),
        new Date().toISOString()
      ]);
    }
  }

  /**
   * Notification'ları cancel et
   */
  private async cancelNotifications(billId: string): Promise<void> {
    if (!this.db) return;

    await this.db.executeSql(
      'DELETE FROM notifications WHERE bill_id = ? AND sent = 0',
      [billId]
    );
  }

  /**
   * Gönderilmemiş notification'ları getir
   */
  async getPendingNotifications(): Promise<DatabaseResult> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      const now = new Date().toISOString();
      const [result] = await this.db.executeSql(`
        SELECT n.*, b.company, b.type, b.amount_value, b.amount_currency
        FROM notifications n
        JOIN bills b ON n.bill_id = b.id
        WHERE n.sent = 0 AND n.scheduled_date <= ? AND b.paid = 0
        ORDER BY n.scheduled_date ASC
      `, [now]);

      const notifications = [];
      for (let i = 0; i < result.rows.length; i++) {
        notifications.push(result.rows.item(i));
      }

      return { success: true, data: notifications };
    } catch (error) {
      console.error('❌ Failed to get pending notifications:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Notification'ı gönderildi olarak işaretle
   */
  async markNotificationAsSent(notificationId: number): Promise<DatabaseResult> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      await this.db.executeSql(`
        UPDATE notifications 
        SET sent = 1, sent_date = ?
        WHERE id = ?
      `, [new Date().toISOString(), notificationId]);

      return { success: true };
    } catch (error) {
      console.error('❌ Failed to mark notification as sent:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * İstatistikleri getir
   */
  async getStatistics(): Promise<DatabaseResult> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      const [totalResult] = await this.db.executeSql(
        'SELECT COUNT(*) as total FROM bills WHERE archived = 0'
      );

      const [paidResult] = await this.db.executeSql(
        'SELECT COUNT(*) as paid FROM bills WHERE paid = 1 AND archived = 0'
      );

      const [overdueResult] = await this.db.executeSql(
        'SELECT COUNT(*) as overdue FROM bills WHERE due_date < ? AND paid = 0 AND archived = 0',
        [new Date().toISOString()]
      );

      const [totalAmountResult] = await this.db.executeSql(`
        SELECT SUM(amount_value) as total_amount, amount_currency
        FROM bills 
        WHERE amount_value IS NOT NULL AND archived = 0
        GROUP BY amount_currency
      `);

      const amountsByCurrency: { [key: string]: number } = {};
      for (let i = 0; i < totalAmountResult.rows.length; i++) {
        const row = totalAmountResult.rows.item(i);
        amountsByCurrency[row.amount_currency] = row.total_amount;
      }

      const statistics = {
        total: totalResult.rows.item(0).total,
        paid: paidResult.rows.item(0).paid,
        overdue: overdueResult.rows.item(0).overdue,
        pending: totalResult.rows.item(0).total - paidResult.rows.item(0).paid,
        totalAmountsByCurrency: amountsByCurrency
      };

      return { success: true, data: statistics };
    } catch (error) {
      console.error('❌ Failed to get statistics:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Veritabanını temizle (DEBUG için)
   */
  async clearDatabase(): Promise<DatabaseResult> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      await this.db.executeSql('DELETE FROM notifications');
      await this.db.executeSql('DELETE FROM bills');
      await this.db.executeSql('DELETE FROM categories');
      
      console.log('🧹 Database cleared');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to clear database:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Row'u BillData objesine çevir
   */
  private mapRowToBillData(row: any): BillData {
    return {
      id: row.id,
      type: row.type as InvoiceType,
      amount: row.amount_value ? {
        value: row.amount_value,
        currency: row.amount_currency as Currency,
        raw: row.amount_raw
      } : undefined,
      dueDate: row.due_date ? {
        date: new Date(row.due_date),
        raw: row.due_date_raw,
        format: row.due_date_format
      } : undefined,
      company: row.company,
      accountNumber: row.account_number,
      confidence: row.confidence,
      ocrText: row.ocr_text,
      imageUri: row.image_uri,
      createdAt: new Date(row.created_at)
    };
  }

  /**
   * Veritabanı bağlantısını kapat
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      console.log('🔒 Database connection closed');
    }
  }
} 