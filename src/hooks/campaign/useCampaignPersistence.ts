import type {
  StoryRuntime,
  MetaProgressionService,
  CampaignSaveManager,
  ArcadeOrchestrator,
  CampaignSaveEnvelopeV1
} from "@tiny-aster/core";

export interface SaveCampaignOptions {
  slotId: string;
  runtime: StoryRuntime;
  metaService: MetaProgressionService;
  saveManager: CampaignSaveManager;
  activeGameId?: string;
  activeGameSeed?: number;
  setStatusMessage?: (msg: string) => void;
  getLocalizedText?: (key?: string) => string;
  onError?: (error: Error) => void;
}

export interface LoadCampaignOptions {
  slotId: string;
  defaultGameId: string;
  runtime: StoryRuntime;
  metaService: MetaProgressionService;
  saveManager: CampaignSaveManager;
  arcadeOrchestrator?: ArcadeOrchestrator;
  switchGame: (gameId: string, overrideSeed?: number) => Promise<void>;
  setStatusMessage?: (msg: string) => void;
  getLocalizedText?: (key?: string) => string;
  onError?: (error: Error) => void;
}

export async function executeCampaignSave(
  options: SaveCampaignOptions
): Promise<CampaignSaveEnvelopeV1 | undefined> {
  const {
    slotId,
    runtime,
    metaService,
    saveManager,
    activeGameId,
    activeGameSeed,
    setStatusMessage,
    getLocalizedText = (k) => k || "",
    onError
  } = options;

  try {
    const envelope = await saveManager.saveCampaign(
      slotId,
      runtime,
      metaService,
      {
        activeGameId,
        activeGameSeed
      }
    );
    setStatusMessage?.(getLocalizedText("campaign.save_success") || "Campaign Saved Successfully!");
    return envelope;
  } catch (err: unknown) {
    console.error("[CampaignScreen] Save failed:", err);
    if (onError) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
    return undefined;
  }
}

export async function executeCampaignLoad(
  options: LoadCampaignOptions
): Promise<CampaignSaveEnvelopeV1 | null> {
  const {
    slotId,
    defaultGameId,
    runtime,
    metaService,
    saveManager,
    arcadeOrchestrator,
    switchGame,
    setStatusMessage,
    getLocalizedText = (k) => k || "",
    onError
  } = options;

  try {
    const envelope = await saveManager.loadCampaign(
      slotId,
      runtime,
      metaService
    );

    if (envelope) {
      arcadeOrchestrator?.reset();
      const restoredNode = runtime.getCurrentNode();
      const sceneFromMeta = typeof restoredNode?.meta?.sceneToLoad === "string" ? restoredNode.meta.sceneToLoad : undefined;
      const targetGame = envelope.activeGameId || restoredNode?.sceneToLoad || sceneFromMeta || defaultGameId;
      await switchGame(targetGame, envelope.activeGameSeed);
      setStatusMessage?.(getLocalizedText("campaign.load_success") || "Campaign Loaded Successfully!");
    }
    return envelope;
  } catch (err: unknown) {
    console.error("[CampaignScreen] Load failed:", err);
    if (onError) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
    return null;
  }
}

export interface UseCampaignPersistenceOptions {
  slotId: string;
  defaultGameId: string;
  runtimeRef: React.RefObject<StoryRuntime | null>;
  metaServiceRef: React.RefObject<MetaProgressionService | null>;
  saveManagerRef: React.RefObject<CampaignSaveManager | null>;
  arcadeOrchestratorRef: React.RefObject<ArcadeOrchestrator | null>;
  activeGameIdRef: React.RefObject<string | null>;
  activeGameSeedRef: React.RefObject<number | null>;
  switchGame: (gameId: string, overrideSeed?: number) => Promise<void>;
  setStatusMessage: (message: string) => void;
  getLocalizedText: (key?: string) => string;
  onError?: (error: Error) => void;
}

export interface UseCampaignPersistenceResult {
  handleSave: () => Promise<CampaignSaveEnvelopeV1 | undefined>;
  handleLoad: () => Promise<CampaignSaveEnvelopeV1 | null>;
}

/**
 * Hook encapsulating campaign persistence operations (saving and restoring state).
 */
export function useCampaignPersistence({
  slotId,
  defaultGameId,
  runtimeRef,
  metaServiceRef,
  saveManagerRef,
  arcadeOrchestratorRef,
  activeGameIdRef,
  activeGameSeedRef,
  switchGame,
  setStatusMessage,
  getLocalizedText,
  onError
}: UseCampaignPersistenceOptions): UseCampaignPersistenceResult {
  const handleSave = async (): Promise<CampaignSaveEnvelopeV1 | undefined> => {
    return executeCampaignSave({
      slotId,
      runtime: runtimeRef.current!,
      metaService: metaServiceRef.current!,
      saveManager: saveManagerRef.current!,
      activeGameId: activeGameIdRef.current || undefined,
      activeGameSeed: activeGameSeedRef.current || undefined,
      setStatusMessage,
      getLocalizedText,
      onError
    });
  };

  const handleLoad = async (): Promise<CampaignSaveEnvelopeV1 | null> => {
    return executeCampaignLoad({
      slotId,
      defaultGameId,
      runtime: runtimeRef.current!,
      metaService: metaServiceRef.current!,
      saveManager: saveManagerRef.current!,
      arcadeOrchestrator: arcadeOrchestratorRef.current || undefined,
      switchGame,
      setStatusMessage,
      getLocalizedText,
      onError
    });
  };

  return { handleSave, handleLoad };
}
