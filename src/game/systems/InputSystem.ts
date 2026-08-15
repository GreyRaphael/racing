export interface InputState {
  throttle: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  drift: boolean;
  resetPressed: boolean;
}

export class InputSystem {
  readonly state: InputState = {
    throttle: false,
    brake: false,
    left: false,
    right: false,
    drift: false,
    resetPressed: false,
  };
  private readonly heldKeys = new Set<string>();
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const key = this.normalizeKey(event);
    if (['w', 'a', 's', 'd', 'r', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
      event.preventDefault();
    }
    this.heldKeys.add(key);
    this.sync();
  };
  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.heldKeys.delete(this.normalizeKey(event));
    this.sync();
  };

  private readonly onBlur = (): void => {
    this.heldKeys.clear();
    this.sync();
  };

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.heldKeys.clear();
  }

  consumeReset(): boolean {
    const pressed = this.state.resetPressed;
    this.state.resetPressed = false;
    return pressed;
  }

  isHeld(key: string): boolean {
    return this.heldKeys.has(key);
  }

  private normalizeKey(event: KeyboardEvent): string {
    const key = event.key.toLowerCase();
    return event.code.toLowerCase() === 'space' || key === 'space' || key === 'spacebar' ? ' ' : key;
  }

  private sync(): void {
    this.state.throttle = this.heldKeys.has('w') || this.heldKeys.has('arrowup');
    this.state.brake = this.heldKeys.has('s') || this.heldKeys.has('arrowdown');
    this.state.left = this.heldKeys.has('a') || this.heldKeys.has('arrowleft');
    this.state.right = this.heldKeys.has('d') || this.heldKeys.has('arrowright');
    this.state.drift = this.heldKeys.has(' ');
    if (this.heldKeys.has('r')) {
      this.state.resetPressed = true;
      this.heldKeys.delete('r');
    }
  }
}
