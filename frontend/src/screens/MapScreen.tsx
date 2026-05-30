import { View, StyleSheet } from 'react-native';
import GraphCanvas from '../components/graph/GraphCanvas';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <GraphCanvas />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
