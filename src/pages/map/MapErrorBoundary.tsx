import { Component, type PropsWithChildren } from 'react';

/* eslint-disable react/destructuring-assignment */
export class MapErrorBoundary extends Component<
  PropsWithChildren,
  { error?: unknown }
> {
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    if (this.state?.error) {
      return (
        <div style={{ margin: 32 }}>
          Map preview unavailable. This layer probably uses complex geometry.
        </div>
      );
    }

    return this.props.children;
  }
}
/* eslint-enable react/destructuring-assignment */
