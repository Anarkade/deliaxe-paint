export interface SimpleColor { r: number; g: number; b: number; transparent?: boolean }

export const getDefaultPalette = (paletteType: string): SimpleColor[] => {
  switch (paletteType) {
    case 'gameboy':
      return [
        { r: 15, g: 56, b: 15 },    // Darkest green
        { r: 48, g: 98, b: 48 },    // Dark green
        { r: 139, g: 172, b: 15 },  // Light green
        { r: 155, g: 188, b: 15 }   // Lightest green
      ];
    case 'megadrive':
      return [
        { r: 0, g: 0, b: 0 },       // Black
        { r: 0, g: 0, b: 146 },     // Dark Blue
        { r: 0, g: 146, b: 0 },     // Dark Green
        { r: 0, g: 146, b: 146 },   // Dark Cyan
        { r: 146, g: 0, b: 0 },     // Dark Red
        { r: 146, g: 0, b: 146 },   // Dark Magenta
        { r: 146, g: 73, b: 0 },    // Brown
        { r: 182, g: 182, b: 182 }, // Light Gray
        { r: 73, g: 73, b: 73 },    // Dark Gray
        { r: 73, g: 73, b: 255 },   // Blue
        { r: 73, g: 255, b: 73 },   // Green
        { r: 73, g: 255, b: 255 },  // Cyan
        { r: 255, g: 73, b: 73 },   // Red
        { r: 255, g: 73, b: 255 },  // Magenta
        { r: 255, g: 255, b: 73 },  // Yellow
        { r: 255, g: 255, b: 255 }  // White
      ];
    default:
      return [];
  }
};

export default getDefaultPalette;
