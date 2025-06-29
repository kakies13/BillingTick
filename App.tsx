/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  FlatList,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import './src/i18n'; // Initialize i18n

import { CameraScreen } from './src/screens/CameraScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { BillData } from './src/types/Bill';
import { DateUtils } from './src/utils/dateUtils';
import { BillDatabase } from './src/services/BillDatabase';
import { NotificationService } from './src/services/NotificationService';
import { AdvancedBillAnalyzer } from './src/services/AdvancedBillAnalyzer';

type AppState = 'home' | 'camera' | 'results';

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [appState, setAppState] = useState<AppState>('home');
  const [currentBill, setCurrentBill] = useState<BillData | null>(null);
  const [savedBills, setSavedBills] = useState<BillData[]>([]);

  useEffect(() => {
    // Initialize all services
    initializeServices();
    console.log('App initialized with language:', i18n.language);
  }, []);

  const initializeServices = async () => {
    try {
      console.log('🚀 Initializing BillingTick Services...');
      
      // 1. Database başlat
      const database = BillDatabase.getInstance();
      const dbResult = await database.initialize();
      if (dbResult.success) {
        console.log('✅ Database initialized');
        // Saved bills'i veritabanından yükle
        loadSavedBills();
      } else {
        console.error('❌ Database initialization failed:', dbResult.error);
      }

      // 2. Notification service başlat  
      const notificationService = NotificationService.getInstance();
      const notifInitialized = await notificationService.initialize();
      if (notifInitialized) {
        console.log('✅ Notification service initialized');
        // App startup'ta overdue bills kontrol et
        await notificationService.checkForOverdueBills();
        await notificationService.updateBadgeCount();
      } else {
        console.error('❌ Notification service failed to initialize');
      }

      // 3. Advanced Analyzer hazırla
      const analyzer = AdvancedBillAnalyzer.getInstance();
      console.log('✅ Advanced Bill Analyzer ready');

      console.log('🎉 All services initialized successfully');
    } catch (error) {
      console.error('❌ Service initialization error:', error);
      Alert.alert('Initialization Error', 'Some features may not work properly.');
    }
  };

  const loadSavedBills = async () => {
    try {
      const database = BillDatabase.getInstance();
      const result = await database.queryBills({ limit: 20 });
      
      if (result.success && result.data) {
        setSavedBills(result.data);
        console.log(`📋 Loaded ${result.data.length} saved bills`);
      }
    } catch (error) {
      console.error('❌ Failed to load saved bills:', error);
    }
  };

  const handleStartScan = () => {
    setAppState('camera');
  };

  const handleBillScanned = (billData: BillData) => {
    setCurrentBill(billData);
    setAppState('results');
  };

  const handleSaveBill = async (billData: BillData) => {
    try {
      // Bills are automatically saved by AdvancedBillAnalyzer
      // Just refresh the list and update UI
      await loadSavedBills();
      Alert.alert(t('common.success'), 'Bill saved successfully!');
      setAppState('home');
      setCurrentBill(null);
    } catch (error) {
      console.error('❌ Failed to save bill:', error);
      Alert.alert('Error', 'Failed to save bill. Please try again.');
    }
  };

  const handleMarkAsPaid = async (billId: string) => {
    try {
      const database = BillDatabase.getInstance();
      const result = await database.updateBillPaymentStatus(billId, true);
      
      if (result.success) {
        // Cancel notifications for this bill
        const notificationService = NotificationService.getInstance();
        await notificationService.cancelBillNotifications(billId);
        
        // Refresh the list
        await loadSavedBills();
        
        Alert.alert(t('common.success'), 'Bill marked as paid!');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Failed to mark bill as paid:', error);
      Alert.alert('Error', 'Failed to update bill status.');
    }
  };

  const handleRetry = () => {
    setCurrentBill(null);
    setAppState('camera');
  };

  const handleBackToHome = () => {
    setCurrentBill(null);
    setAppState('home');
  };

  const renderBillItem = ({ item }: { item: BillData }) => (
    <View style={styles.billItem}>
      <Image source={{ uri: item.imageUri }} style={styles.billThumbnail} />
      <View style={styles.billInfo}>
        <Text style={styles.billType}>{t(`invoice_types.${item.type}`)}</Text>
        {item.amount && (
          <Text style={styles.billAmount}>
            {DateUtils.formatCurrency(item.amount.value, item.amount.currency)}
          </Text>
        )}
        {item.dueDate?.date && (
          <Text style={styles.billDate}>
            {DateUtils.formatDate(item.dueDate.date)}
          </Text>
        )}
        <Text style={styles.billConfidence}>
          {t('results.confidence')}: {Math.round(item.confidence * 100)}%
        </Text>
      </View>
    </View>
  );

  const renderHomeScreen = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>BillingTick</Text>
        <Text style={styles.appSubtitle}>Global Bill Scanner</Text>
      </View>

      {/* Main Action */}
      <View style={styles.mainSection}>
        <TouchableOpacity style={styles.scanButton} onPress={handleStartScan}>
          <Text style={styles.scanButtonText}>📸</Text>
          <Text style={styles.scanButtonLabel}>{t('common.scan')}</Text>
        </TouchableOpacity>
        <Text style={styles.scanInstruction}>
          {t('camera.instruction')}
        </Text>
      </View>

      {/* Saved Bills */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Recent Scans ({savedBills.length})</Text>
        {savedBills.length > 0 ? (
          <FlatList
            data={savedBills}
            renderItem={renderBillItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            style={styles.billsList}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No bills scanned yet</Text>
            <Text style={styles.emptySubtext}>Tap the scan button to get started!</Text>
          </View>
        )}
      </View>

      {/* Language Indicator */}
      <View style={styles.languageIndicator}>
        <Text style={styles.languageText}>
          🌍 {i18n.language.toUpperCase()}
        </Text>
      </View>
    </SafeAreaView>
  );

  // Main App Router
  switch (appState) {
    case 'camera':
      return (
        <CameraScreen
          onBillScanned={handleBillScanned}
          onCancel={handleBackToHome}
        />
      );
    case 'results':
      return currentBill ? (
        <ResultsScreen
          billData={currentBill}
          onSave={handleSaveBill}
          onRetry={handleRetry}
          onBack={handleBackToHome}
        />
      ) : null;
    default:
      return renderHomeScreen();
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  mainSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  scanButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scanButtonText: {
    fontSize: 40,
    marginBottom: 5,
  },
  scanButtonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scanInstruction: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6c757d',
    lineHeight: 24,
    maxWidth: 280,
  },
  historySection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 15,
  },
  billsList: {
    flex: 1,
  },
  billItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  billThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  billInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  billType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 4,
  },
  billAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 2,
  },
  billDate: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  billConfidence: {
    fontSize: 12,
    color: '#adb5bd',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
  },
  languageIndicator: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  languageText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: 'bold',
  },
});

export default App;
