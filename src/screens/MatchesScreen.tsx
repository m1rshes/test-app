import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MATCHES_URL } from '../config';
import { useFavorites } from '../hooks/useFavorites';
import { FavoriteButton } from '../components/FavoriteButton';
import { UpdatedAgo } from '../components/UpdatedAgo';

type MatchStatus = 'finished' | 'live' | 'scheduled' | 'postponed';

type Team = {
  id: string;
  name: string;
  city: string;
};

type Match = {
  id: string;
  startsAt: string | null;
  status: MatchStatus;
  minute?: number;
  home: Team;
  away: Team;
  score: { home: number; away: number } | null;
};

type ApiResponse = {
  round: number;
  matches: Match[];
};

type FilterType = 'all' | 'upcoming' | 'finished';

export function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const { isFavorite, toggle } = useFavorites();

  const fetchMatches = async () => {
    try {
      setError(null);
      const response = await fetch(MATCHES_URL);
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных с сервера');
      }
      const data: ApiResponse = await response.json();
      setMatches(data.matches);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMatches();
  }, []);

  // Перевод статусов на русский + обработка минут для лайва
  const formatStatus = (match: Match) => {
    switch (match.status) {
      case 'finished':
        return 'Завершен';
      case 'live':
        return match.minute ? `Идет (${match.minute}')` : 'Идет';
      case 'scheduled':
        return 'Предстоящий';
      case 'postponed':
        return 'Перенесен';
      default:
        return match.status;
    }
  };

  // Форматирование даты в часовой пояс устройства
  const formatDateTime = (startsAt: string | null) => {
    if (!startsAt) return 'Дата уточняется';
    try {
      const date = new Date(startsAt);
      return date.toLocaleString([], {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Дата уточняется';
    }
  };

  // Логика фильтрации
  const filteredMatches = matches.filter((match) => {
    if (filter === 'upcoming') {
      return match.status === 'scheduled' || match.status === 'live';
    }
    if (filter === 'finished') {
      return match.status === 'finished';
    }
    return true;
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ef3124" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={fetchMatches}>
          <Text style={styles.retryButtonText}>Повторить</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Шапка с обновлением */}
      <View style={styles.header}>
        <UpdatedAgo since={lastUpdated} />
        <Pressable onPress={fetchMatches} style={styles.refreshBtn}>
          <Text style={styles.refreshBtnText}>Обновить</Text>
        </Pressable>
      </View>

      {/* Фильтры */}
      <View style={styles.filtersContainer}>
        <Pressable
          style={[styles.filterTab, filter === 'all' && styles.activeTab]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeText]}>Все</Text>
        </Pressable>
        <Pressable
          style={[styles.filterTab, filter === 'upcoming' && styles.activeTab]}
          onPress={() => setFilter('upcoming')}
        >
          <Text style={[styles.filterText, filter === 'upcoming' && styles.activeText]}>Предстоящие</Text>
        </Pressable>
        <Pressable
          style={[styles.filterTab, filter === 'finished' && styles.activeTab]}
          onPress={() => setFilter('finished')}
        >
          <Text style={[styles.filterText, filter === 'finished' && styles.activeText]}>Завершённые</Text>
        </Pressable>
      </View>

      {/* Список матчей */}
      <FlatList
        data={filteredMatches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Матчей не найдено</Text>
          </View>
        }
        renderItem={({ item }) => {
          const favorite = isFavorite(item.id);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.statusText}>{formatStatus(item)}</Text>
                <FavoriteButton active={favorite} onPress={() => toggle(item.id)} />
              </View>

              <View style={styles.teamsRow}>
                <View style={styles.teamContainer}>
                  <Text style={styles.teamName}>{item.home.name}</Text>
                  <Text style={styles.cityText}>{item.home.city}</Text>
                </View>

                <View style={styles.scoreContainer}>
                  {item.score ? (
                    <Text style={styles.scoreText}>
                      {item.score.home} : {item.score.away}
                    </Text>
                  ) : (
                    <Text style={styles.vsText}>VS</Text>
                  )}
                </View>

                <View style={[styles.teamContainer, styles.alignRight]}>
                  <Text style={styles.teamName}>{item.away.name}</Text>
                  <Text style={styles.cityText}>{item.away.city}</Text>
                </View>
              </View>

              <Text style={styles.dateText}>{formatDateTime(item.startsAt)}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  refreshBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  refreshBtnText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  activeTab: {
    backgroundColor: '#2563eb',
  },
  filterText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  activeText: {
    color: '#fff',
  },
  listContainer: {
    padding: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  teamsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  teamContainer: {
    flex: 1,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  teamName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  cityText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  scoreContainer: {
    paddingHorizontal: 12,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  vsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9ca3af',
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef3124',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
});