import widgetBehavior from '@kitware/vtk.js/Widgets/Widgets3D/ResliceCursorWidget/behavior';

export default function customBehavior(publicAPI: any, model: any) {

  widgetBehavior(publicAPI, model);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const superClass = { ...publicAPI };

  model.classHierarchy.push('vtkMprWidgetProp');
}
