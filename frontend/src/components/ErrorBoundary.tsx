import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('🔴 ErrorBoundary caught error:', error);
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔴 ErrorBoundary error details:', error);
    console.error('🔴 Component stack:', errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>⚠️ 오류 발생</Text>
          <Text style={styles.message}>
            {this.state.error?.message || '알 수 없는 오류가 발생했습니다.'}
          </Text>
          <Text style={styles.stack}>
            {this.state.error?.stack?.split('\n').slice(0, 5).join('\n')}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    
    flex: 1,
    backgroundColor: Colors.background.deepSpace,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.starlight,
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: Colors.text.moonmist,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  stack: {
    fontSize: 12,
    color: Colors.text.dusk,
    fontFamily: 'monospace',
    textAlign: 'left',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  button: {
    backgroundColor: Colors.accent.nebulaRose,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.starlight,
  },
});
