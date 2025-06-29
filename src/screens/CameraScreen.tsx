import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Camera, useCameraDevices, PhotoFile } from 'react-native-vision-camera';
import { useTranslation } from 'react-i18next';
import { CameraService } from '../services/CameraService';
import { OCRService } from '../services/OCRService';
import { AdvancedBillAnalyzer } from '../services/AdvancedBillAnalyzer';
import { BillData, InvoiceType } from '../types/Bill';

interface CameraScreenProps {
  onBillScanned: (billData: BillData) => void;
  onCancel: () => void;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({
  onBillScanned,
  onCancel,
}) => {
  const { t } = useTranslation();
  const camera = useRef<Camera>(null);
  const devices = useCameraDevices();
  const device = devices.find(d => d.position === 'back') || devices[0];

  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const permitted = await CameraService.checkCameraPermission();
    if (!permitted) {
      const granted = await CameraService.requestCameraPermission();
      if (!granted) {
        Alert.alert(
          t('camera.permission_denied'),
          t('camera.permission_request'),
          [{ text: t('common.cancel'), onPress: onCancel }]
        );
        return;
      }
    }
    setHasPermission(true);
  };

  const capturePhoto = async () => {
    if (!camera.current || isLoading) return;

    try {
      setIsLoading(true);
      setLoadingText(t('camera.capturing'));

      const photo: PhotoFile = await camera.current.takePhoto();

      await processImage(photo.path);
    } catch (error) {
      console.error('Capture error:', error);
      Alert.alert(t('common.error'), 'Failed to capture photo');
      setIsLoading(false);
    }
  };

  const processImage = async (imagePath: string) => {
    try {
      setLoadingText(t('camera.processing'));

      const formattedUri = CameraService.formatImageUri(imagePath);
      
      // OCR Processing
      setLoadingText(t('analysis.analyzing'));
      const ocrResult = await OCRService.processImage(formattedUri);
      
      if (!ocrResult.text.trim()) {
        Alert.alert(t('common.error'), t('analysis.no_text_found'));
        setIsLoading(false);
        return;
      }

      // Advanced Bill Analysis
      const analyzer = AdvancedBillAnalyzer.getInstance();
      const analysisResult = await analyzer.analyzeBillAdvanced(formattedUri, {
        optimizeImage: true,
        saveToDatabase: true,
        scheduleNotifications: true
      });

      if (!analysisResult.success || !analysisResult.billData) {
        throw new Error(analysisResult.error || 'Analysis failed');
      }
      
      // Use the billData from advanced analysis
      const billData = analysisResult.billData;

      setIsLoading(false);
      onBillScanned(billData);
    } catch (error) {
      console.error('Processing error:', error);
      Alert.alert(t('common.error'), t('analysis.analysis_failed'));
      setIsLoading(false);
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Text style={styles.permissionText}>{t('camera.permission_request')}</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Text style={styles.permissionText}>Camera not available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <Camera
        ref={camera}
        style={styles.camera}
        device={device}
        isActive={!isLoading}
        photo={true}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('camera.title')}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Instruction */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>{t('camera.instruction')}</Text>
        </View>

        {/* Capture Frame */}
        <View style={styles.captureFrame}>
          <View style={[styles.frameCorner, styles.topLeft]} />
          <View style={[styles.frameCorner, styles.topRight]} />
          <View style={[styles.frameCorner, styles.bottomLeft]} />
          <View style={[styles.frameCorner, styles.bottomRight]} />
        </View>

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        )}

        {/* Capture Button */}
        <View style={styles.captureContainer}>
          <TouchableOpacity
            style={[styles.captureButton, isLoading && styles.captureButtonDisabled]}
            onPress={capturePhoto}
            disabled={isLoading}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cancelButton: {
    padding: 10,
  },
  cancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 60,
  },
  instructionContainer: {
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
  },
  captureFrame: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
    height: '30%',
  },
  frameCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#fff',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  captureContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
}); 