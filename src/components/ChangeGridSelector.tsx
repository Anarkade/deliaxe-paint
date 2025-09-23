import React from 'react';
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
  t: (key: string) => string;
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
  showFrameGrid,
  setShowFrameGrid,
  frameWidth,
  setFrameWidth,
  frameHeight,
  setFrameHeight,
  frameGridColor,
  setFrameGridColor,
  t,
  onClose,
}) => (
  <div className="absolute z-50 bg-card border border-elegant-border rounded-xl shadow-xl left-[-5px] right-0 top-0" onClick={e => e.stopPropagation()} data-section="change-grids">
    <Card className="bg-elegant-bg border-elegant-border p-6 relative">
      <Button variant="ghost" size="sm" onClick={onClose} className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground">
        <X className="h-4 w-4" />
      </Button>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3">
            <Grid3X3 className="h-6 w-6" style={{ color: '#7d1b2d' }} />
            <h3 className="text-xl font-bold" style={{ color: '#7d1b2d' }}>{t('changeGrids')}</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t('changeGridsDesc')}</p>
        </div>
        <div className="space-y-6">
          {/* Tile Grid Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox id="show-tile-grid" checked={showTileGrid} onCheckedChange={checked => setShowTileGrid(!!checked)} />
              <label htmlFor="show-tile-grid" className="text-sm font-medium text-foreground cursor-pointer">{t('showTileGrid')}</label>
            </div>
            {showTileGrid && (
              <div className="ml-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">{t('width')}</label>
                    <input type="number" min="1" max="64" value={tileWidth} onChange={e => setTileWidth(Math.max(1, parseInt(e.target.value) || 1))} className="w-full px-2 py-1 text-sm border border-input rounded bg-background" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t('height')}</label>
                    <input type="number" min="1" max="64" value={tileHeight} onChange={e => setTileHeight(Math.max(1, parseInt(e.target.value) || 1))} className="w-full px-2 py-1 text-sm border border-input rounded bg-background" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t('tileGridColor')}</label>
                    <input type="color" value={tileGridColor} onChange={e => setTileGridColor(e.target.value)} className="w-full h-8 border border-input rounded bg-background cursor-pointer" />
                  </div>
                </div>
              </div>
            )}
          </div>
          <Separator />
          {/* Frame Grid Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox id="show-frame-grid" checked={showFrameGrid} onCheckedChange={checked => setShowFrameGrid(!!checked)} />
              <label htmlFor="show-frame-grid" className="text-sm font-medium text-foreground cursor-pointer">{t('showFrameGrid')}</label>
            </div>
            {showFrameGrid && (
              <div className="ml-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">{t('width')}</label>
                    <input type="number" min="1" max="128" value={frameWidth} onChange={e => setFrameWidth(Math.max(1, parseInt(e.target.value) || 1))} className="w-full px-2 py-1 text-sm border border-input rounded bg-background" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t('height')}</label>
                    <input type="number" min="1" max="128" value={frameHeight} onChange={e => setFrameHeight(Math.max(1, parseInt(e.target.value) || 1))} className="w-full px-2 py-1 text-sm border border-input rounded bg-background" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t('frameGridColor')}</label>
                    <input type="color" value={frameGridColor} onChange={e => setFrameGridColor(e.target.value)} className="w-full h-8 border border-input rounded bg-background cursor-pointer" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  </div>
);
