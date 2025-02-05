<template>
  <div class="vtk-container-wrapper">
    <div class="vtk-gutter">
      <v-tooltip right transition="slide-x-transition">
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            x-small
            icon
            @click="enableResizeToFit"
            v-bind="attrs"
            v-on="on"
          >
            <v-icon small class="py-1">mdi-camera-flip-outline</v-icon>
          </v-btn>
        </template>
        <span>Reset camera</span>
      </v-tooltip>
      <slice-slider
        class="slice-slider"
        :slice="slice"
        :min="sliceMin"
        :max="sliceMax"
        :step="1"
        :handle-height="20"
        @input="setSlice"
      />
    </div>
    <div class="vtk-container" :class="active ? 'active' : ''">
      <div class="vtk-sub-container">
        <div class="vtk-view" ref="vtkContainerRef" />
      </div>
      <div class="overlay-no-events tool-layer">
        <pan-tool :view-id="viewID" />
        <zoom-tool :view-id="viewID" />
        <slice-scroll-tool :view-id="viewID" />
        <window-level-tool :view-id="viewID" />
        <ruler-tool
          view-type="2D"
          :view-id="viewID"
          :widget-manager="widgetManager"
          :view-direction="viewDirection"
          :slice="slice"
        />
        <paint-tool
          :view-id="viewID"
          :view-direction="viewDirection"
          :widget-manager="widgetManager"
          :slice="slice"
        />
        <crosshairs-tool
          :view-id="viewID"
          :view-direction="viewDirection"
          :widget-manager="widgetManager"
          :slice="slice"
        />
      </div>
      <view-overlay-grid class="overlay-no-events view-annotations">
        <template v-slot:top-middle>
          <div class="annotation-cell">
            <span>{{ topLabel }}</span>
          </div>
        </template>
        <template v-slot:middle-left>
          <div class="annotation-cell">
            <span>{{ leftLabel }}</span>
          </div>
        </template>
        <template v-slot:bottom-left>
          <div class="annotation-cell">
            <div>Slice: {{ slice + 1 }}/{{ sliceMax + 1 }}</div>
            <div>
              W/L: {{ windowWidth.toFixed(2) }} / {{ windowLevel.toFixed(2) }}
            </div>
          </div>
        </template>
        <template v-slot:top-right>
          <div class="annotation-cell">
            <v-menu
              open-on-hover
              offset-y
              left
              nudge-left="10"
              dark
              v-if="dicomInfo !== null"
              max-width="200px"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  dark
                  small
                  icon
                  v-bind="attrs"
                  v-on="on"
                  class="info-button"
                >
                  <v-icon dark> mdi-information </v-icon>
                </v-btn>
              </template>
              <v-list class="grey darken-3">
                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title class=".font-color"
                      >PATIENT / CASE</v-list-item-title
                    >
                    <v-divider />
                    <v-list-item-title
                      >ID: {{ dicomInfo.patientID }}</v-list-item-title
                    >
                  </v-list-item-content>
                </v-list-item>
                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title>STUDY</v-list-item-title>
                    <v-divider />
                    <v-list-item-title
                      >ID: {{ dicomInfo.studyID }}</v-list-item-title
                    >
                    <v-list-item-title>{{
                      dicomInfo.studyDescription
                    }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title>SERIES</v-list-item-title>
                    <v-divider />
                    <v-list-item-title
                      >SERIES #: {{ dicomInfo.seriesNumber }}</v-list-item-title
                    >
                    <v-list-item-title>{{
                      dicomInfo.seriesDescription
                    }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </template>
      </view-overlay-grid>
      <transition name="loading">
        <div v-if="isImageLoading" class="overlay-no-events loading">
          <div>Loading the image</div>
          <div>
            <v-progress-circular indeterminate color="blue" />
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  onBeforeUnmount,
  onMounted,
  onUnmounted,
  PropType,
  ref,
  toRefs,
  watch,
  watchEffect,
} from '@vue/composition-api';
import { vec3 } from 'gl-matrix';

import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';

import { useView2DStore } from '@/src/store/views-2D';
import { useResizeToFit } from '@src/composables/useResizeToFit';
import vtkLPSView2DProxy from '@src/vtk/LPSView2DProxy';
import vtkIJKSliceRepresentationProxy from '@src/vtk/IJKSliceRepresentationProxy';
import { manageVTKSubscription } from '@src/composables/manageVTKSubscription';
import SliceSlider from '@src/components/SliceSlider.vue';
import ViewOverlayGrid from '@src/components/ViewOverlayGrid.vue';
import { useResizeObserver } from '../composables/useResizeObserver';
import { useOrientationLabels } from '../composables/useOrientationLabels';
import { getLPSAxisFromDir, LPSAxisDir } from '../utils/lps';
import { useCurrentImage } from '../composables/useCurrentImage';
import { useCameraOrientation } from '../composables/useCameraOrientation';
import WindowLevelTool from './tools/WindowLevelTool.vue';
import SliceScrollTool from './tools/SliceScrollTool.vue';
import PanTool from './tools/PanTool.vue';
import ZoomTool from './tools/ZoomTool.vue';
import RulerTool from './tools/RulerTool.vue';
import PaintTool from './tools/PaintTool.vue';
import { useSceneBuilder } from '../composables/useSceneBuilder';
import { useDICOMStore } from '../store/datasets-dicom';
import { useLabelmapStore } from '../store/datasets-labelmaps';
import vtkLabelMapSliceRepProxy from '../vtk/LabelMapSliceRepProxy';
import { usePaintToolStore } from '../store/tools/paint';
import {
  useViewConfigStore,
  defaultSliceConfig,
  defaultWindowLevelConfig,
  CameraConfig,
} from '../store/view-configs';
import { usePersistCameraConfig } from '../composables/usePersistCameraConfig';
import CrosshairsTool from './tools/CrosshairsTool.vue';

export default defineComponent({
  name: 'VtkTwoView',
  props: {
    viewDirection: {
      type: String as PropType<LPSAxisDir>,
      required: true,
    },
    viewUp: {
      type: String as PropType<LPSAxisDir>,
      required: true,
    },
  },
  components: {
    SliceSlider,
    ViewOverlayGrid,
    WindowLevelTool,
    SliceScrollTool,
    PanTool,
    ZoomTool,
    RulerTool,
    PaintTool,
    CrosshairsTool,
  },
  setup(props) {
    const view2DStore = useView2DStore();
    const viewConfigStore = useViewConfigStore();
    const paintStore = usePaintToolStore();

    const { viewDirection, viewUp } = toRefs(props);

    const vtkContainerRef = ref<HTMLElement>();

    const viewAxis = computed(() => getLPSAxisFromDir(viewDirection.value));

    // --- view creation --- //

    // TODO changing the viewDirection prop is not supported at this time.
    const { id: viewID, proxy: viewProxy } =
      view2DStore.createView<vtkLPSView2DProxy>(viewDirection.value);

    // --- computed vars --- //

    const {
      currentImageData: curImageData,
      currentImageID: curImageID,
      currentImageMetadata: curImageMetadata,
      isImageLoading,
    } = useCurrentImage();

    const dicomStore = useDICOMStore();

    const sliceConfigDefaults = defaultSliceConfig();
    const sliceConfig = computed(() =>
      curImageID.value !== null
        ? viewConfigStore.getSliceConfig(viewID, curImageID.value)
        : null
    );
    const currentSlice = computed(() =>
      sliceConfig.value !== null
        ? sliceConfig.value.slice
        : sliceConfigDefaults.slice
    );
    const sliceMin = computed(() =>
      sliceConfig.value !== null
        ? sliceConfig.value.min
        : sliceConfigDefaults.min
    );
    const sliceMax = computed(() =>
      sliceConfig.value !== null
        ? sliceConfig.value.max
        : sliceConfigDefaults.max
    );

    const windowConfigDefaults = defaultWindowLevelConfig();
    const wlConfig = computed(() =>
      curImageID.value !== null
        ? viewConfigStore.getWindowConfig(viewID, curImageID.value)
        : null
    );
    const windowWidth = computed(() =>
      wlConfig.value !== null
        ? wlConfig.value.width
        : windowConfigDefaults.width
    );
    const windowLevel = computed(() =>
      wlConfig.value !== null
        ? wlConfig.value.level
        : windowConfigDefaults.level
    );
    const dicomInfo = computed(() => {
      if (
        curImageID.value !== null &&
        curImageID.value in dicomStore.imageIDToVolumeKey
      ) {
        const volumeKey = dicomStore.imageIDToVolumeKey[curImageID.value];
        const volumeInfo = dicomStore.volumeInfo[volumeKey];
        const studyKey = dicomStore.volumeStudy[volumeKey];
        const studyInfo = dicomStore.studyInfo[studyKey];
        const patientKey = dicomStore.studyPatient[studyKey];
        const patientInfo = dicomStore.patientInfo[patientKey];

        const patientID = patientInfo.PatientID;
        const studyID = studyInfo.StudyID;
        const studyDescription = studyInfo.StudyDescription;
        const seriesNumber = volumeInfo.SeriesNumber;
        const seriesDescription = volumeInfo.SeriesDescription;

        return {
          patientID,
          studyID,
          studyDescription,
          seriesNumber,
          seriesDescription,
        };
      }

      return null;
    });

    // --- view proxy setup --- //

    onUnmounted(() => {
      viewConfigStore.removeViewConfig(viewID);
    });

    // do this before mounting
    viewProxy.getInteractorStyle2D().removeAllManipulators();

    onMounted(() => {
      viewProxy.setContainer(vtkContainerRef.value ?? null);
      viewProxy.setOrientationAxesVisibility(false);
    });

    onBeforeUnmount(() => {
      viewProxy.setContainer(null);
      view2DStore.removeView(viewID);
    });

    // updates slicing mode based on the IJK index
    watchEffect(() => {
      const ijkIndex = curImageMetadata.value.lpsOrientation[viewAxis.value];
      viewProxy.setSlicingMode('IJK'[ijkIndex]);
    });

    useResizeObserver(vtkContainerRef, () => viewProxy.resize());

    // --- widget manager --- //

    const widgetManager = vtkWidgetManager.newInstance({
      useSvgLayer: false,
    });
    widgetManager.setRenderer(viewProxy.getRenderer());

    onUnmounted(() => {
      widgetManager.delete();
    });

    // --- resetting slice properties --- //

    watch(
      curImageData,
      (imageData, oldImageData) => {
        // FIXME the old check is to workaround a vue bug/quirk where
        // the curImageData dependencies trigger, but the ref value is
        // equivalent, yet this watcher still runs.
        if (imageData && imageData !== oldImageData) {
          const { lpsOrientation, dimensions } = curImageMetadata.value;
          const ijkIndex = lpsOrientation[viewAxis.value];
          const dimMax = dimensions[ijkIndex];

          // update dimensions
          // dimMax is upper bound of slices, exclusive.
          if (
            curImageID.value !== null &&
            viewConfigStore.getSliceConfig(viewID, curImageID.value) === null
          ) {
            viewConfigStore.updateSliceDomain(viewID, curImageID.value, [
              0,
              dimMax - 1,
            ]);
            // move slice to center when image metadata changes.
            // TODO what if new slices are added to the same image?
            //      do we still reset the slicing?
            viewConfigStore.setSlice(
              viewID,
              curImageID.value,
              Math.floor((dimMax - 1) / 2)
            );
          }
        }
      },

      // we don't use watchEffect, since I think
      // accessing the actions on view2DStore cause it
      // to trigger when any view2DStore state is modified.
      { immediate: true }
    );

    // --- window/level setup --- //

    watch(
      curImageData,
      (imageData, oldImageData) => {
        if (imageData && imageData !== oldImageData) {
          // TODO listen to changes in point data
          const range = imageData.getPointData().getScalars().getRange();
          if (
            curImageID.value !== null &&
            viewConfigStore.getWindowConfig(viewID, curImageID.value) === null
          ) {
            viewConfigStore.updateWLDomain(viewID, curImageID.value, range);
            viewConfigStore.resetWindowLevel(viewID, curImageID.value);
          }
        }
      },
      {
        immediate: true,
      }
    );

    // --- scene setup --- //

    const labelmapStore = useLabelmapStore();

    const labelmapIDs = computed(() => {
      return labelmapStore.idList.filter(
        (id) => labelmapStore.parentImage[id] === curImageID.value
      );
    });

    const { baseImageRep, labelmapReps } = useSceneBuilder<
      vtkIJKSliceRepresentationProxy,
      vtkLabelMapSliceRepProxy
    >(viewID, {
      baseImage: curImageID,
      labelmaps: labelmapIDs,
    });

    // --- camera setup --- //

    const { cameraDirVec, cameraUpVec } = useCameraOrientation(
      viewDirection,
      viewUp,
      curImageMetadata
    );
    const { resizeToFit, ignoreResizeToFitTracking, resetResizeToFitTracking } =
      useResizeToFit(viewProxy.getCamera(), false);

    const resizeToFitScene = () =>
      ignoreResizeToFitTracking(() => {
        // resize to fit
        const lookAxis =
          curImageMetadata.value.lpsOrientation[
            getLPSAxisFromDir(viewDirection.value)
          ];
        const upAxis =
          curImageMetadata.value.lpsOrientation[
            getLPSAxisFromDir(viewUp.value)
          ];
        const dimsWithSpacing = curImageMetadata.value.dimensions.map(
          (d, i) => d * curImageMetadata.value.spacing[i]
        );
        viewProxy.resizeToFit(lookAxis, upAxis, dimsWithSpacing);
        resetResizeToFitTracking();
      });

    const resetCamera = () => {
      const bounds = curImageMetadata.value.worldBounds;
      const center = [
        (bounds[0] + bounds[1]) / 2,
        (bounds[2] + bounds[3]) / 2,
        (bounds[4] + bounds[5]) / 2,
      ] as vec3;

      // do not track resizeToFit state
      ignoreResizeToFitTracking(() => {
        viewProxy.updateCamera(cameraDirVec.value, cameraUpVec.value, center);
        viewProxy.resetCamera(bounds);
      });

      resizeToFitScene();

      viewProxy.render();
    };

    manageVTKSubscription(
      viewProxy.onResize(() => {
        if (resizeToFit.value) {
          resizeToFitScene();
        }
      })
    );

    // if we re-enable resizeToFit, reset the camera
    watch(resizeToFit, () => {
      if (resizeToFit.value) {
        resetCamera();
      }
    });

    const { restoreCameraConfig } = usePersistCameraConfig(
      viewID,
      curImageID,
      viewProxy,
      'parallelScale',
      'position',
      'focalPoint',
      'viewUp'
    );

    watch(
      [curImageID, cameraDirVec, cameraUpVec],
      () => {
        let cameraConfig: CameraConfig | null = null;
        if (curImageID.value !== null) {
          cameraConfig = viewConfigStore.getCameraConfig(
            viewID,
            curImageID.value
          );
        }

        // If we have a save camera configuration restore it
        if (cameraConfig) {
          restoreCameraConfig(cameraConfig);

          viewProxy.getRenderer().resetCameraClippingRange();
          viewProxy.render();

          // Prevent resize
          resizeToFit.value = false;
        } else if (resizeToFit.value) {
          resetCamera();
        } else {
          // this will trigger a resetCamera() call
          resizeToFit.value = true;
        }
      },
      { immediate: true, deep: true }
    );

    // --- viewport orientation/camera labels --- //

    const { top: topLabel, left: leftLabel } = useOrientationLabels(viewProxy);

    // --- apply windowing and slice configs --- //

    watchEffect(() => {
      if (sliceConfig.value === null || wlConfig.value === null) {
        return;
      }

      const { slice } = sliceConfig.value;
      const { width, level } = wlConfig.value;
      const rep = baseImageRep.value;
      if (rep) {
        rep.setSlice(slice);
        rep.setWindowWidth(width);
        rep.setWindowLevel(level);
      }
      labelmapReps.value.forEach((lmRep) => {
        lmRep.setSlice(slice);
      });

      viewProxy.render();
    });

    // --- apply labelmap opacity --- //

    watchEffect(() => {
      const { labelmapOpacity } = paintStore;
      labelmapReps.value.forEach((lmRep) => {
        lmRep.setOpacity(labelmapOpacity);
      });
    });

    // --- template vars --- //

    return {
      vtkContainerRef,
      viewID,
      viewProxy,
      viewAxis,
      active: true,
      slice: currentSlice,
      sliceMin,
      sliceMax,
      windowWidth,
      windowLevel,
      topLabel,
      leftLabel,
      isImageLoading,
      setSlice: (slice: number) => {
        if (curImageID.value !== null) {
          viewConfigStore.setSlice(viewID, curImageID.value, slice);
        }
      },
      widgetManager,
      dicomInfo,
      enableResizeToFit() {
        resizeToFit.value = true;
      },
    };
  },
});
</script>

<style scoped src="@/src/components/styles/vtk-view.css"></style>
