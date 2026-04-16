import type { ReactNode } from 'react';
import {
  Modal,
  View,
  KeyboardAvoidingView,
  Pressable,
  Keyboard,
  Platform,
  StyleSheet,
} from 'react-native';

type Props = {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
  /** Offset vertical del teclado (cabecera nativa en iOS). */
  keyboardVerticalOffset?: number;
};

export function KeyboardAwareFormModal({
  visible,
  onRequestClose,
  children,
  keyboardVerticalOffset,
}: Props) {
  const offset = keyboardVerticalOffset ?? (Platform.OS === 'ios' ? 64 : 0);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onRequestClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={Keyboard.dismiss} accessibilityRole="button" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={offset}
          style={styles.kav}
        >
          {children}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  kav: { width: '100%', justifyContent: 'flex-end', maxHeight: '100%' },
});
