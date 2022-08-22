import macro from '@kitware/vtk.js/macro';
import vtkAbstractWidgetFactory from '@kitware/vtk.js/Widgets/Core/AbstractWidgetFactory';

import vtkResliceCursorWidget from '@kitware/vtk.js/Widgets/Widgets3D/ResliceCursorWidget';

import customBehavior from './behavior';

// ----------------------------------------------------------------------------
// Factory
// ----------------------------------------------------------------------------

function vtkMprWidget(publicAPI, model) {
  model.classHierarchy.push('vtkMprWidget');

  model.behavior = customBehavior;
}

// ----------------------------------------------------------------------------

function defaultValues(initialValues) {
  return {
    ...initialValues
  };
}

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  vtkResliceCursorWidget.extend(publicAPI, model, defaultValues(initialValues));

  vtkAbstractWidgetFactory.extend(publicAPI, model, initialValues);

  vtkMprWidget(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkMprWidget');

// ----------------------------------------------------------------------------

export default { newInstance, extend };
