import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors } from '../theme';
import { createJob, pollJob } from '../api';

type Props = NativeStackScreenProps<RootStackParamList, 'Loading'>;

const STAGE_LABELS: Record<string, string> = {
  queued: 'Queued…',
  downloading: 'Downloading the video and reading its caption…',
  transcribing: 'Transcribing the audio…',
  extracting: 'Extracting the recipe…',
};

export default function LoadingScreen({ route, navigation }: Props) {
  const { url } = route.params;
  const [message, setMessage] = useState('Starting…');
  const [errorText, setErrorText] = useState<string | null>(null);
  const cancelRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const job = await createJob(url);
        if (cancelled) return;
        setMessage(STAGE_LABELS[job.status] ?? job.message);

        const { promise, cancel } = pollJob(job.job_id, update => {
          if (cancelled) return;
          setMessage(STAGE_LABELS[update.status] ?? update.message);
        });
        cancelRef.current = cancel;

        const finalJob = await promise;
        if (cancelled) return;

        if (finalJob.status === 'error' || !finalJob.result) {
          setErrorText(finalJob.error || finalJob.message || 'Something went wrong.');
          return;
        }

        navigation.replace('Recipe', { mode: 'fresh', result: finalJob.result });
      } catch (e: any) {
        if (!cancelled) {
          setErrorText(e?.message || 'Something went wrong reaching the backend.');
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {errorText ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Couldn't extract a recipe</Text>
          <Text style={styles.errorText}>{errorText}</Text>
          <Pressable style={styles.button} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Back</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.message}>{message}</Text>
          <Text style={styles.hint}>
            This can take a minute or two, especially the first request after a
            while — the free backend has to wake up first.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  message: { marginTop: 18, fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center' },
  hint: { marginTop: 10, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  errorTitle: { fontSize: 18, fontWeight: '700', color: colors.error, marginBottom: 10 },
  errorText: { fontSize: 14, color: colors.text, textAlign: 'center', marginBottom: 20 },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: { color: colors.accentText, fontSize: 15, fontWeight: '700' },
});
