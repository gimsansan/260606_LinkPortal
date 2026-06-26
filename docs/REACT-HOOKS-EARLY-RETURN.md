# React Hook 조기 return 주의점

## 이번에 놓친 개념

React Hook은 컴포넌트가 렌더링될 때마다 항상 같은 순서로 호출되어야 한다.

이번 문제는 `App.tsx`에서 `useMemo`가 `if (!ready) return ...` 아래에 놓이면서 발생했다. 첫 렌더에서는 `ready`가 `false`라서 조기 return이 실행되고 `useMemo`가 호출되지 않았다. 다음 렌더에서 `ready`가 `true`가 되면 그때는 `useMemo`가 호출되므로, React 입장에서는 렌더마다 Hook 호출 개수가 달라진다.

## 문제 패턴

```tsx
if (!ready) {
  return <div>로딩 중...</div>;
}

const value = useMemo(() => {
  return computeValue();
}, []);
```

이 구조는 조건에 따라 Hook이 호출되기도 하고 호출되지 않기도 한다.

## 올바른 패턴

```tsx
const value = useMemo(() => {
  return computeValue();
}, []);

if (!ready) {
  return <div>로딩 중...</div>;
}
```

Hook은 조기 return보다 위에 둔다. 렌더 결과를 조건으로 나누는 것은 괜찮지만, Hook 호출 자체가 조건에 따라 달라지면 안 된다.

## 기억할 규칙

- `useState`, `useEffect`, `useMemo`, `useCallback`은 컴포넌트 최상위에서 호출한다.
- `if`, `for`, `while`, 조기 `return` 아래에 Hook을 두지 않는다.
- 조건부 계산이 필요하면 Hook 내부에서 조건을 처리한다.
- JSX를 일찍 반환해야 하는 로딩 화면이 있어도, Hook 선언은 그보다 위에 둔다.

## 이번 수정 방향

`nextDefaultFolderTitle`을 계산하는 `useMemo`를 `if (!ready)`보다 위로 이동했다. 이렇게 하면 로딩 중 렌더와 준비 완료 렌더 모두에서 Hook 호출 순서가 동일하게 유지된다.
