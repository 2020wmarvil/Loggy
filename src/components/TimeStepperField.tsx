import * as Haptics from 'expo-haptics';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { formatTime12, parseTime } from '@/lib/routine';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';
import { radii, weight650 } from '@/theme/tokens';

interface TimeStepperFieldProps {
  time: string;
  onChange: (time: string) => void;
  onClose?: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));
const MERIDIEMS = ['AM', 'PM'];

function to12(hour24: number): { hour12: number; meridiem: 'AM' | 'PM' } {
  const meridiem = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12, meridiem };
}

function to24(hour12: number, meridiem: 'AM' | 'PM'): number {
  const h = hour12 % 12;
  return meridiem === 'PM' ? h + 12 : h;
}

// Tap-to-open drag wheel picker. Storage stays 24h "HH:MM" (for sorting and
// notifications), but the picker itself shows 12h + AM/PM since a wheel makes
// the format unambiguous without needing 24h to rule out guessing.
export function TimeStepperField({ time, onChange, onClose }: TimeStepperFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const parsed = parseTime(time);
  const hour24 = parsed ? parsed.hour : 0;
  const minute = parsed ? parsed.minute : 0;
  const { hour12, meridiem } = to12(hour24);

  function close() {
    setOpen(false);
    onClose?.();
  }

  function commitHour(idx: number) {
    onChange(`${pad(to24(idx + 1, meridiem))}:${pad(minute)}`);
  }
  function commitMinute(idx: number) {
    onChange(`${pad(hour24)}:${pad(idx)}`);
  }
  function commitMeridiem(idx: number) {
    const newMeridiem = idx === 0 ? 'AM' : 'PM';
    onChange(`${pad(to24(hour12, newMeridiem))}:${pad(minute)}`);
  }

  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.pill, { backgroundColor: theme.s2, borderColor: theme.border2 }]}
      >
        <Text style={[styles.pillText, { color: theme.text }]}>{formatTime12(time)}</Text>
      </Pressable>
      <Modal transparent visible={open} animationType="none" onRequestClose={close}>
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={close} />
          <View style={[styles.centerWrap, { pointerEvents: 'box-none' }]}>
            <View style={[styles.card, { backgroundColor: theme.s1, borderColor: theme.border }]}>
              <View style={styles.wheelRow}>
                <View style={[styles.selectionBand, { backgroundColor: theme.greenDim, borderColor: theme.greenMid }]} />
                <WheelColumn items={HOURS} index={hour12 - 1} onCommit={commitHour} loop />
                <Text style={[styles.colon, { color: theme.muted }]}>:</Text>
                <WheelColumn items={MINUTES} index={minute} onCommit={commitMinute} loop />
                <WheelColumn items={MERIDIEMS} index={meridiem === 'AM' ? 0 : 1} onCommit={commitMeridiem} />
              </View>
              <Pressable
                onPress={close}
                style={[styles.doneBtn, { backgroundColor: theme.greenDim, borderColor: theme.greenMid }]}
              >
                <Text style={[styles.doneBtnText, { color: theme.green }]}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const ITEM_HEIGHT = 60;
// 5 rows (2 above/below the selection) instead of 3, so more values are
// reachable by a direct tap without having to scroll one into view first.
const VISIBLE_COUNT = 5;
const PAD_COUNT = Math.floor(VISIBLE_COUNT / 2);
// Looping columns render this many back-to-back copies of the values, giving
// enough buffer that a single strong fling never reaches the real start/end of
// the rendered list. Re-centering onto the middle copy only ever happens once
// scrolling has fully stopped (see handleScroll) — nudging scrollTop mid-fling,
// even onto pixel-identical content, visibly hitches the browser's own momentum.
const LOOP_COPIES = 11;
const MIDDLE_COPY = Math.floor(LOOP_COPIES / 2);

const wrapIndex = (raw: number, len: number) => ((raw % len) + len) % len;

function triggerTickHaptic() {
  Haptics.selectionAsync().catch(() => {});
}

interface WheelColumnProps {
  items: string[];
  index: number;
  onCommit: (index: number) => void;
  loop?: boolean;
}

function WheelColumn({ items, index, onCommit, loop = false }: WheelColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const didInit = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTickIndex = useRef(index);

  function baseOffsetFor(i: number) {
    return loop ? (MIDDLE_COPY * items.length + i) * ITEM_HEIGHT : i * ITEM_HEIGHT;
  }

  // `onLayout` never fires for a ScrollView nested in a Modal on web in this RNW
  // version, so the initial position is set on mount instead — the offset is
  // computed purely from known constants, no measured layout is actually needed.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    scrollRef.current?.scrollTo({ y: baseOffsetFor(index), animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, []);

  // react-native-web's ScrollView never fires onMomentumScrollEnd/onScrollEndDrag
  // (dead props there) and ignores snapToInterval, so both the live commit and the
  // final snap are driven from onScroll alone, with our own debounce for "settled".
  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;

    const rawIndex = Math.round(y / ITEM_HEIGHT);
    const nearest = loop ? wrapIndex(rawIndex, items.length) : Math.max(0, Math.min(items.length - 1, rawIndex));

    if (nearest !== lastTickIndex.current) {
      lastTickIndex.current = nearest;
      triggerTickHaptic();
      onCommit(nearest);
    }

    settleTo(y, nearest);
  }

  function settleTo(y: number, nearest: number) {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      // Only touch scrollTop once motion has fully stopped — nudging it mid-fling,
      // even onto pixel-identical content in another copy, visibly hitches momentum.
      if (loop) {
        const spanHeight = items.length * ITEM_HEIGHT;
        const relative = ((y % spanHeight) + spanHeight) % spanHeight;
        const recenteredY = MIDDLE_COPY * spanHeight + relative;
        if (recenteredY !== y) {
          scrollRef.current?.scrollTo({ y: recenteredY, animated: false });
        }
      }
      scrollRef.current?.scrollTo({ y: baseOffsetFor(nearest), animated: true });
    }, 120);
  }

  // Lets a value be picked directly by tapping it (e.g. AM/PM, or a nearby
  // hour/minute) instead of only via scroll-and-settle. Jumps straight there
  // (no animation) since the user already told us exactly where they want to
  // land — animating it would just delay a choice they already made.
  //
  // Read via a ref (see handleItemPressRef below) rather than closed over
  // directly by the memoized item list, so that list doesn't need to be
  // rebuilt just because onCommit's identity changed on a re-render.
  function handleItemPress(itemIndex: number) {
    triggerTickHaptic();
    lastTickIndex.current = itemIndex;
    onCommit(itemIndex);
    scrollRef.current?.scrollTo({ y: baseOffsetFor(itemIndex), animated: false });
  }
  const handleItemPressRef = useRef(handleItemPress);
  useLayoutEffect(() => {
    handleItemPressRef.current = handleItemPress;
  });

  // `items`/`loop` never change identity for a mounted WheelColumn, but
  // without memoizing this, every parent-triggered re-render (any routine
  // edit, any tap) was rebuilding all 660 View+Text pairs for the minutes
  // column from scratch — real work multiplied across every keystroke, and
  // the remaining cause of the picker still feeling sluggish after switching
  // off per-item Pressables.
  //
  // Only the loop copies near the middle (where settleTo always re-centers
  // once scrolling stops, so the visible rows always live) are wrapped in a
  // real Pressable, each closing over its own known index — reliable, unlike
  // deriving the tapped item from touch position on one giant Pressable
  // spanning the whole scrollable content (that measured inconsistently
  // across engines and could resolve to a bogus, even out-of-range index).
  // The remaining copies exist only as fling-buffer and are never visible at
  // rest, so they don't need to be tappable — kept as plain, cheap Views.
  const renderedItemViews = useMemo(() => {
    if (!loop) {
      return items.map((label, i) => (
        <Pressable key={i} onPress={() => handleItemPressRef.current(i)} style={styles.wheelItem}>
          <Text style={styles.wheelText}>{label}</Text>
        </Pressable>
      ));
    }
    const views: React.ReactNode[] = [];
    for (let copy = 0; copy < LOOP_COPIES; copy++) {
      const interactive = copy >= MIDDLE_COPY - 1 && copy <= MIDDLE_COPY + 1;
      for (let j = 0; j < items.length; j++) {
        const key = `${copy}-${j}`;
        views.push(
          interactive ? (
            <Pressable key={key} onPress={() => handleItemPressRef.current(j)} style={styles.wheelItem}>
              <Text style={styles.wheelText}>{items[j]}</Text>
            </Pressable>
          ) : (
            <View key={key} style={styles.wheelItem}>
              <Text style={styles.wheelText}>{items[j]}</Text>
            </View>
          )
        );
      }
    }
    return views;
  }, [items, loop]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.wheelCol}
      showsVerticalScrollIndicator={false}
      decelerationRate="normal"
      scrollEventThrottle={16}
      onScroll={handleScroll}
      contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * PAD_COUNT }}
    >
      {renderedItemViews}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pill: { minWidth: 70, alignItems: 'center', justifyContent: 'center', borderRadius: 6, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 8 },
  pillText: { fontSize: 12.5, fontVariant: ['tabular-nums'], fontWeight: '500' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.6)' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { borderRadius: radii.card, borderWidth: 1, padding: 16, alignItems: 'center' },
  wheelRow: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  wheelCol: { height: ITEM_HEIGHT * VISIBLE_COUNT, width: 56 },
  wheelItem: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  // Hardcoded rather than pulled from theme: muted is fixed regardless of
  // accent (see makeTheme in theme/colors.ts), and not depending on theme
  // here keeps this style static so the memoized item list above never needs
  // to be invalidated.
  wheelText: { fontSize: 26, fontWeight: weight650, fontVariant: ['tabular-nums'], color: palette.muted },
  // A single hairline-bordered band spanning the whole row, not per-column —
  // the classic wheel-picker "selection lens" look, instead of glowing the text.
  selectionBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * PAD_COUNT,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    pointerEvents: 'none',
  },
  colon: { fontSize: 24, fontWeight: '600', marginHorizontal: -4 },
  doneBtn: { marginTop: 14, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1 },
  doneBtnText: { fontSize: 13, fontWeight: '600' },
});
