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
    case 'gameboyBg':
      // Game Boy (GB Studio backgrounds) palette
      return [
        { r: 7, g: 24, b: 33 },      // Darkest
        { r: 48, g: 104, b: 80 },    // Dark
        { r: 134, g: 192, b: 108 },  // Light
        { r: 224, g: 248, b: 207 }   // Lightest
      ];
    case 'gameboyRealistic':
      // Game Boy realistic green palette
      return [
        { r: 56, g: 72, b: 40 },     // Darkest
        { r: 96, g: 112, b: 40 },    // Dark
        { r: 160, g: 168, b: 48 },   // Light
        { r: 208, g: 224, b: 64 }    // Lightest
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
