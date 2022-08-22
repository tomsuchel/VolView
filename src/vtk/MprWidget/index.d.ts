import vtkAbstractWidget from '@kitware/vtk.js/Widgets/Core/AbstractWidget';
import vtkAbstractWidgetFactory from '@kitware/vtk.js/Widgets/Core/AbstractWidgetFactory';
import vtkPlaneManipulator from '@kitware/vtk.js/Widgets/Manipulators/PlaneManipulator';
import { mat4, vec3 } from 'gl-matrix';
import { MprWidgetState } from './state';

export interface vtkMprViewWidget extends vtkAbstractWidget {
  setManipulator(manipulator: vtkPlaneManipulator): boolean;
  getManipulator(): vtkPlaneManipulator;
}

export interface vtkMprWidget extends vtkAbstractWidgetFactory {
  getWidgetState(): MprWidgetState;
  getManipulator(): vtkPlaneManipulator;
}

export function newInstance(): vtkMprWidget;

export declare const vtkMprWidget: {
  newInstance: typeof newInstance;
};
export default vtkMprWidget;
