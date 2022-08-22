<template>
  <div v-if="active" class="overlay-no-events">
    <svg class="overlay-no-events">
      <MprSVG2D
        v-show="isVisible"
        :view-id="viewId"
        :position="position"
      />
    </svg>
    <MprWidget2D
      :slice="slice"
      :view-id="viewId"
      :view-direction="viewDirection"
      :widget-manager="widgetManager"
    />
  </div>
</template>

<script lang="ts">
import { storeToRefs } from 'pinia';
import {
  computed,
  defineComponent,
  PropType,
  toRefs,
} from '@vue/composition-api';
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import { getLPSAxisFromDir, LPSAxisDir } from '@/src/utils/lps';
import { Tools, useToolStore } from '@/src/store/tools';
import { useMprToolStore } from '@/src/store/tools/mpr';
import { useCurrentImage } from '@/src/composables/useCurrentImage';
import { clampValue } from '@/src/utils';
import MprWidget2D from './mpr/MprWidget2D.vue';
import MprSVG2D from './mpr/MprSVG2D.vue';

export default defineComponent({
  name: 'MprTool',
  props: {
    viewId: {
      type: String,
      required: true,
    },
    slice: {
      type: Number,
      required: true,
    },
    viewDirection: {
      type: String as PropType<LPSAxisDir>,
      required: true,
    },
    widgetManager: {
      type: Object as PropType<vtkWidgetManager>,
      required: true,
    },
  },
  components: {
    MprWidget2D,
    MprSVG2D,
  },
  setup(props) {
    const { viewDirection, slice } = toRefs(props);

    const toolStore = useToolStore();
    const { position, imagePosition } = storeToRefs(useMprToolStore());

    const { currentImageMetadata } = useCurrentImage();
    const active = computed(() => toolStore.currentTool === Tools.Mpr);
    const isVisible = computed(() => {
      const { lpsOrientation, dimensions } = currentImageMetadata.value;
      const axis = getLPSAxisFromDir(viewDirection.value);
      const index = lpsOrientation[axis];
      // Since the image rectangle is inflated by 0.5,
      // clamp to the allowed range for the slice.
      const crosshairsSlice = clampValue(
        imagePosition.value[index],
        0,
        dimensions[index] - 1
      );
      return Math.round(crosshairsSlice) === slice.value;
    });

    return {
      active,
      position,
      isVisible,
    };
  },
});
</script>

<style scoped src="@/src/components/styles/vtk-view.css"></style>
