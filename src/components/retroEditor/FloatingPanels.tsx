import React from 'react';
import ColorEditor from '../floatingMenus/ColorEditor';
import { PaletteViewer } from '../floatingMenus/PaletteViewer';
import { Toolbar } from '../floatingMenus/Toolbar';
import { Footer } from '../floatingMenus/Footer';

type FloatingPanelsProps = {
  // Allow parent to pass visibility flags or callbacks as needed.
  showToolbar?: boolean;
  showPalette?: boolean;
  showColorEditor?: boolean;
  // Forward props to the underlying components when available
  toolbarProps?: any;
  paletteProps?: any;
  colorEditorProps?: any;
};

export const FloatingPanels: React.FC<FloatingPanelsProps> = ({ showToolbar = true, showPalette = true, showColorEditor = false, toolbarProps, paletteProps, colorEditorProps }) => {
  return (
    <>
      {showToolbar && <Toolbar {...(toolbarProps || {})} />}
      {showPalette && <PaletteViewer {...(paletteProps || { selectedPalette: 'original', imageData: null, onPaletteUpdate: () => {} })} />}
      {showColorEditor && (
        <ColorEditor {...(colorEditorProps || { initial: { r: 0, g: 0, b: 0 }, onAccept: () => {}, onCancel: () => {} })} />
      )}
      <Footer {...(toolbarProps?.footerProps || { isVerticalLayout: false })} />
    </>
  );
};

export default FloatingPanels;
