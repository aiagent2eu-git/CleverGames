type LevelSelectorProps = {
  level: number;
  onChange: (level: number) => void;
};

export function LevelSelector({ level, onChange }: LevelSelectorProps) {
  return (
    <div className="level-selector" aria-label="Niveles de sudoku">
      {Array.from({ length: 10 }, (_, index) => index + 1).map((item) => (
        <button
          key={item}
          className={item === level ? 'level-button active' : 'level-button'}
          type="button"
          onClick={() => onChange(item)}
          aria-pressed={item === level}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
