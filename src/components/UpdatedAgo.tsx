import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

type Props = {
  since: Date;
};

export function UpdatedAgo({ since }: Props) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    // Сбрасываем секунды при каждом обновлении пропса `since`
    setSeconds(0);

    const interval = setInterval(() => {
      const diffInSeconds = Math.floor((Date.now() - since.getTime()) / 1000);
      setSeconds(diffInSeconds >= 0 ? diffInSeconds : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [since]);

  return <Text style={styles.text}>Обновлено {seconds} сек назад</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    color: '#6b7280',
  },
});