import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { BillData } from '../types/Bill';
import { DateUtils } from '../utils/dateUtils';

interface ResultsScreenProps {
  billData: BillData;
  onSave: (billData: BillData) => void;
  onRetry: () => void;
  onBack: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  billData,
  onSave,
  onRetry,
  onBack,
}) => {
  const { t } = useTranslation();
  const [showRawText, setShowRawText] = useState(false);

  const handleSave = () => {
    if (billData.confidence < 0.7) {
      Alert.alert(
        t('analysis.low_confidence'),
        `${t('results.confidence')}: ${Math.round(billData.confidence * 100)}%`,
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.save'), onPress: () => onSave(billData) },
        ]
      );
    } else {
      onSave(billData);
    }
  };

  const formatAmount = (amount: any) => {
    if (!amount) return t('common.not_found');
    return DateUtils.formatCurrency(amount.value, amount.currency);
  };

  const formatDate = (dateInfo: any) => {
    if (!dateInfo?.date) return t('common.not_found');
    return DateUtils.formatDate(dateInfo.date);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#4CAF50'; // Green
    if (confidence >= 0.6) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getDaysUntilDue = () => {
    if (!billData.dueDate?.date) return null;
    const days = DateUtils.getDaysUntilDue(billData.dueDate.date);
    return days;
  };

  const daysUntilDue = getDaysUntilDue();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onBack}>
          <Text style={styles.headerButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('results.title')}</Text>
        <TouchableOpacity style={styles.headerButton} onPress={onRetry}>
          <Text style={styles.headerButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Preview */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: billData.imageUri }} style={styles.image} />
        </View>

        {/* Confidence Indicator */}
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>{t('results.confidence')}</Text>
          <View style={styles.confidenceBar}>
            <View
              style={[
                styles.confidenceFill,
                {
                  width: `${billData.confidence * 100}%`,
                  backgroundColor: getConfidenceColor(billData.confidence),
                },
              ]}
            />
          </View>
          <Text style={[styles.confidenceText, { color: getConfidenceColor(billData.confidence) }]}>
            {Math.round(billData.confidence * 100)}%
          </Text>
        </View>

        {/* Results */}
        <View style={styles.resultsContainer}>
          {/* Bill Type */}
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>{t('results.type')}</Text>
            <Text style={styles.resultValue}>
              {t(`invoice_types.${billData.type}`)}
            </Text>
          </View>

          {/* Amount */}
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>{t('results.amount')}</Text>
            <Text style={[styles.resultValue, styles.amountText]}>
              {formatAmount(billData.amount)}
            </Text>
          </View>

          {/* Due Date */}
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>{t('results.due_date')}</Text>
            <View>
              <Text style={styles.resultValue}>
                {formatDate(billData.dueDate)}
              </Text>
              {daysUntilDue !== null && (
                <Text
                  style={[
                    styles.daysText,
                    daysUntilDue < 0 ? styles.overdue : daysUntilDue <= 7 ? styles.dueSoon : styles.dueNormal,
                  ]}
                >
                  {daysUntilDue < 0
                    ? `${Math.abs(daysUntilDue)} days overdue`
                    : daysUntilDue === 0
                    ? 'Due today'
                    : `${daysUntilDue} days remaining`}
                </Text>
              )}
            </View>
          </View>

          {/* Company */}
          {billData.company && (
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>{t('results.company')}</Text>
              <Text style={styles.resultValue}>{billData.company}</Text>
            </View>
          )}
        </View>

        {/* Raw OCR Text */}
        <View style={styles.rawTextContainer}>
          <TouchableOpacity
            style={styles.rawTextHeader}
            onPress={() => setShowRawText(!showRawText)}
          >
            <Text style={styles.rawTextTitle}>{t('results.raw_text')}</Text>
            <Text style={styles.rawTextToggle}>{showRawText ? '−' : '+'}</Text>
          </TouchableOpacity>
          {showRawText && (
            <View style={styles.rawTextContent}>
              <Text style={styles.rawTextValue}>{billData.ocrText}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>{t('common.save')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    padding: 5,
    minWidth: 50,
  },
  headerButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    margin: 20,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
    width: 80,
  },
  confidenceBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginRight: 10,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: 'bold',
    width: 40,
  },
  resultsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  resultItem: {
    marginBottom: 15,
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  resultValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  daysText: {
    fontSize: 12,
    marginTop: 2,
  },
  overdue: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  dueSoon: {
    color: '#FF9800',
    fontWeight: '500',
  },
  dueNormal: {
    color: '#666',
  },
  rawTextContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  rawTextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f8f8',
  },
  rawTextTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  rawTextToggle: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  rawTextContent: {
    padding: 15,
  },
  rawTextValue: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  retryButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 15,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 