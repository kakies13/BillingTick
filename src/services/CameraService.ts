import { Camera, CameraPermissionStatus } from 'react-native-vision-camera';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Platform } from 'react-native';

export class CameraService {
  static async requestCameraPermission(): Promise<boolean> {
    try {
      // First try Vision Camera permission
      const cameraPermission = await Camera.requestCameraPermission();
      
      if (cameraPermission !== 'granted') {
        // Fallback to react-native-permissions
        const permission = Platform.OS === 'ios' 
          ? PERMISSIONS.IOS.CAMERA 
          : PERMISSIONS.ANDROID.CAMERA;
          
        const result = await request(permission);
        return result === RESULTS.GRANTED;
      }
      
      return cameraPermission === 'granted';
    } catch (error) {
      console.error('Camera permission error:', error);
      return false;
    }
  }

  static async checkCameraPermission(): Promise<boolean> {
    try {
      const cameraPermission = await Camera.getCameraPermissionStatus();
      return cameraPermission === 'granted';
    } catch (error) {
      console.error('Check camera permission error:', error);
      return false;
    }
  }

  static async getAvailableCameraDevices() {
    try {
      const devices = await Camera.getAvailableCameraDevices();
      return devices.filter(device => device.position === 'back'); // Prefer back camera for document scanning
    } catch (error) {
      console.error('Get camera devices error:', error);
      return [];
    }
  }

  static formatImageUri(imageUri: string): string {
    // Ensure proper file:// prefix for different platforms
    if (Platform.OS === 'android' && !imageUri.startsWith('file://')) {
      return `file://${imageUri}`;
    }
    return imageUri;
  }
} 