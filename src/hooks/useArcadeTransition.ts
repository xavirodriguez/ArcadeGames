import { useEffect } from 'react';
import { useSharedValue, withTiming, withSequence, withDelay, Easing } from 'react-native-reanimated';
import type { ArcadeKernel, EventBus } from '@tiny-aster/core';
import { ArcadeState } from '@tiny-aster/core';

/**
 * Hook que maneja transiciones de UI basadas en cambios de estado del ArcadeKernel.
 *
 * IMPORTANTE:
 * - Usa eventBus.on() para suscribirse (no useState)
 * - Retorna SharedValues para Reanimated
 * - Unsubscribe en cleanup
 */
export function useArcadeTransition(kernel: ArcadeKernel, eventBus: EventBus) {
  const menuOpacity = useSharedValue(1);
  const menuTranslateX = useSharedValue(0);
  const canvasOpacity = useSharedValue(0);
  const canvasBlur = useSharedValue(0);
  const pauseOverlayOpacity = useSharedValue(0);
  const gameOverPanelTranslateY = useSharedValue(100);

  useEffect(() => {
    if (!eventBus) return;

    // eventBus.on returns () => void directly
    const unsubscribe = eventBus.on('arcade:state_changed', (data: any) => {
      const { from, to } = data;

      // MENU → PLAYING
      if (from === ArcadeState.MENU && to === ArcadeState.PLAYING) {
        menuOpacity.value = withTiming(0, {
          duration: 200,
          easing: Easing.out(Easing.quad)
        });
        menuTranslateX.value = withTiming(-400, {
          duration: 200,
          easing: Easing.out(Easing.quad)
        });

        // Canvas entra con delay, sin setTimeout
        canvasOpacity.value = withSequence(
          withDelay(50, withTiming(1, {
            duration: 150,
            easing: Easing.in(Easing.quad)
          }))
        );
      }

      // PLAYING → PAUSED
      if (from === ArcadeState.PLAYING && to === ArcadeState.PAUSED) {
        canvasBlur.value = withTiming(8, {
          duration: 100,
          easing: Easing.out(Easing.quad)
        });
        pauseOverlayOpacity.value = withTiming(0.5, {
          duration: 100,
          easing: Easing.out(Easing.quad)
        });
      }

      // PAUSED → PLAYING
      if (from === ArcadeState.PAUSED && to === ArcadeState.PLAYING) {
        canvasBlur.value = withTiming(0, {
          duration: 100,
          easing: Easing.in(Easing.quad)
        });
        pauseOverlayOpacity.value = withTiming(0, {
          duration: 100,
          easing: Easing.in(Easing.quad)
        });
      }

      // PLAYING → GAME_OVER
      if (from === ArcadeState.PLAYING && to === ArcadeState.GAME_OVER) {
        canvasBlur.value = withTiming(8, {
          duration: 100,
          easing: Easing.out(Easing.quad)
        });
        gameOverPanelTranslateY.value = withSequence(
          withDelay(100, withTiming(0, {
            duration: 200,
            easing: Easing.out(Easing.back(1.5))
          }))
        );
      }
    });

    return unsubscribe;
  }, [kernel, eventBus, menuOpacity, menuTranslateX, canvasOpacity, canvasBlur, pauseOverlayOpacity, gameOverPanelTranslateY]);

  return {
    menuOpacity,
    menuTranslateX,
    canvasOpacity,
    canvasBlur,
    pauseOverlayOpacity,
    gameOverPanelTranslateY,
  };
}
