import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Grid3X3, X } from 'lucide-react';

interface ChangeGridSelectorProps {
  showTileGrid: boolean;
  setShowTileGrid: (v: boolean) => void;
  tileWidth: number;
  setTileWidth: (v: number) => void;
  tileHeight: number;
  setTileHeight: (v: number) => void;
  tileGridColor: string;
  setTileGridColor: (v: string) => void;
  showFrameGrid: boolean;
  setShowFrameGrid: (v: boolean) => void;
  frameWidth: number;
  setFrameWidth: (v: number) => void;
  frameHeight: number;
  setFrameHeight: (v: number) => void;
  frameGridColor: string;
  setFrameGridColor: (v: string) => void;
  tileLineThickness: number;
  setTileLineThickness: (v: number) => void;
  frameLineThickness: number;
  setFrameLineThickness: (v: number) => void;
  // Removed t prop, use hook instead
  onClose: () => void;
}

export const ChangeGridSelector: React.FC<ChangeGridSelectorProps> = ({
  showTileGrid,
  setShowTileGrid,
  tileWidth,
  setTileWidth,
  tileHeight,
  setTileHeight,
  tileGridColor,
  setTileGridColor,
  tileLineThickness,
  setTileLineThickness,
  showFrameGrid,
  setShowFrameGrid,
  frameWidth,
  setFrameWidth,
  frameHeight,
  setFrameHeight,
  frameGridColor,
  setFrameGridColor,
  frameLineThickness,
  setFrameLineThickness,
  onClose,
}) => {
  const { t } = useTranslation();
  return (
    <Card
      className="absolute z-50 left-0 right-0 p-7 bg-card border-elegant-border rounded-xl"
      onClick={(e) => e.stopPropagation()}
      data-section="change-grids"
    >
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="space-y-6">
          <div>
            <h3
              className="text-xl font-bold flex items-center"
              style={{ color: '#7d1b2d' }}
            >
              <Grid3X3 className="mr-2 h-6 w-6" style={{ color: '#7d1b2d' }} />
              {t('changeGrids')}
            </h3>
            <p className="text-sm text-muted-foreground pt-2 pb-2 text-left">
              {t('changeGridsDesc')}
            </p>
          </div>
          <div className="border-t border-elegant-border my-4" />
          <div className="flex gap-6">
            {/* Tile Grid Column */}
            <div className="flex-1">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="show-tile-grid" className="h-4 w-4 mt-0 mr-2 flex-shrink-0" checked={showTileGrid} onCheckedChange={checked => setShowTileGrid(!!checked)} />
                  <label htmlFor="show-tile-grid" className="block text-sm font-medium text-foreground cursor-pointer text-left">{t('showTileGrid')}</label>
                </div>
                {showTileGrid && (
                  <div className="ml-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Top row: Width | Height */}
                      <div>
                        <label className="block text-xs text-muted-foreground text-left">{t('width')}</label>
                        <input
                          type="number"
                          min="1"
                          max="64"
                          value={tileWidth}
                          onChange={e => setTileWidth(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground text-left">{t('height')}</label>
                        <input
                          type="number"
                          min="1"
                          max="64"
                          value={tileHeight}
                          onChange={e => setTileHeight(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
                        />
                      </div>

                      {/* Bottom row: Line thickness | Color */}
                      <div>
                        <label className="block text-xs text-muted-foreground text-left">{t('tileLineThickness')}</label>
                        <input
                          type="number"
                          min="1"
                          value={tileLineThickness}
                          onChange={e => setTileLineThickness(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground text-left">{t('tileGridColor')}</label>
                        <input
                          type="color"
                          value={tileGridColor}
                          onChange={e => setTileGridColor(e.target.value)}
                          className="w-full h-8 border border-input rounded bg-background cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Vertical separator */}
            <div className="w-px bg-border" />

            {/* Frame Grid Column */}
            <div className="flex-1">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="show-frame-grid" className="h-4 w-4 mt-0 mr-2 flex-shrink-0" checked={showFrameGrid} onCheckedChange={checked => setShowFrameGrid(!!checked)} />
                  <label htmlFor="show-frame-grid" className="block text-sm font-medium text-foreground cursor-pointer text-left">{t('showFrameGrid')}</label>
                </div>
                {showFrameGrid && (
                  <div className="ml-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Top row: Width | Height */}
                      <div>
                        <label className="block text-xs text-muted-foreground text-left">{t('width')}</label>
                        <input
                          type="number"
                          min="1"
                          max="128"
                          value={frameWidth}
                          onChange={e => setFrameWidth(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground text-left">{t('height')}</label>
                        <input
                          type="number"
                          min="1"
                          max="128"
                          value={frameHeight}
                          onChange={e => setFrameHeight(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
                        />
                      </div>

                      {/* Bottom row: Line thickness | Color */}
                      <div>
                        <label className="block text-xs text-muted-foreground text-left">{t('frameLineThickness')}</label>
                        <input
                          type="number"
                          min="1"
                          value={frameLineThickness}
                          onChange={e => setFrameLineThickness(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground text-left">{t('frameGridColor')}</label>
                        <input
                          type="color"
                          value={frameGridColor}
                          onChange={e => setFrameGridColor(e.target.value)}
                          className="w-full h-8 border border-input rounded bg-background cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
  );
};
