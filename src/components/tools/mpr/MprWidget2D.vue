<script lang="ts">
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import {
  defineComponent,
  onBeforeUnmount,
  onMounted,
  PropType,
  ref,
  toRefs,
  watchEffect,
} from '@vue/composition-api';
import vtkPlaneManipulator from '@kitware/vtk.js/Widgets/Manipulators/PlaneManipulator';
import { LPSAxisDir } from '@/src/utils/lps';
import { useCurrentImage } from '@/src/composables/useCurrentImage';
import { updatePlaneManipulatorFor2DView } from '@/src/utils/manipulators';
import { useMprToolStore } from '@/src/store/tools/mpr';
import { vtkMprViewWidget } from '@/src/vtk/MprWidget';

export default defineComponent({
  name: 'MprWidget2D',
  props: {
    widgetManager: {
      type: Object as PropType<vtkWidgetManager>,
      required: true,
    },
    viewId: {
      type: String,
      required: true,
    },
    viewDirection: {
      type: String as PropType<LPSAxisDir>,
      required: true,
    },
    slice: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    const {
      widgetManager: widgetManagerRef,
      viewDirection,
      slice,
    } = toRefs(props);

    const mprStore = useMprToolStore();
    const factory = mprStore.getWidgetFactory();

    const widgetRef = ref<vtkMprViewWidget>();

    const { currentImageMetadata } = useCurrentImage();
    onMounted(() => {
      const widgetManager = widgetManagerRef.value;
      widgetRef.value = widgetManager.addWidget(
        factory
      ) as vtkMprViewWidget;

      if (!widgetRef.value) {
        throw new Error('[PaintWidget2D] failed to create view widget');
      }
    });

    // --- manipulator --- //

    const manipulator = vtkPlaneManipulator.newInstance();

    onMounted(() => {
      widgetRef.value!.setManipulator(manipulator);
    });

    watchEffect(() => {
      updatePlaneManipulatorFor2DView(
        manipulator,
        viewDirection.value,
        slice.value,
        currentImageMetadata.value
      );
    });

    // --- visibility --- //

    onMounted(() => {
      widgetRef.value!.setVisibility(true);
    });

    // --- focus and rendering --- //

    onMounted(() => {
      const widgetManager = widgetManagerRef.value;
      widgetManager.renderWidgets();
    });

    onBeforeUnmount(() => {
      widgetManagerRef.value.removeWidget(widgetRef.value!);
    });

    return () => null;
  },
});
</script>
