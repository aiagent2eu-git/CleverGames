import { Calculator, Grid3X3, Type } from 'lucide-react';
import type { GameType } from '../game/types';

type GameTabsProps = {
  activeGame: GameType;
  onChange: (game: GameType) => void;
};

const tabs: Array<{ id: GameType; label: string; icon: typeof Grid3X3 }> = [
  { id: 'sudoku', label: 'Sudoku', icon: Grid3X3 },
  { id: 'numbers', label: 'Cifras', icon: Calculator },
  { id: 'letters', label: 'Letras', icon: Type },
];

export function GameTabs({ activeGame, onChange }: GameTabsProps) {
  return (
    <nav className="game-tabs" aria-label="Juegos diarios">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            className={activeGame === tab.id ? 'tab-button active' : 'tab-button'}
            type="button"
            aria-label={tab.label}
            onClick={() => onChange(tab.id)}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
