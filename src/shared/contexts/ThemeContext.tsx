import { createContext, useCallback, useContext, useMemo } from "react";
import { ThemeProvider } from "styled-components";
import { usePersistedState } from "../hook/usePersistedState";

import { lightTheme, darkTheme } from '../themes/Theme';
import { GlobalStyle } from '../themes/GlobalStyle';

interface IThemeData {
  themeName: 'light' | 'dark',
  toggleTheme: () => void
}

interface IAppThemeProviderProps {
  children: React.ReactNode
}

const ThemeContext = createContext<IThemeData>({
} as IThemeData);

export const AppThemeContext = () => {
  return useContext(ThemeContext);
};

export const AppThemeProvider: React.FC<IAppThemeProviderProps> = ({
  children
}) => {
  const [themeName, setThemeName] = usePersistedState('theme', 'light')

  const toggleTheme = useCallback(() => {
    setThemeName((oldThemeName:string) => oldThemeName === 'light' ? 'dark' : 'light')
  }, []);

  const theme = useMemo(() => {
    if (themeName === 'light') return lightTheme;
    return darkTheme;
  }, [themeName]);

  return (
    <div>
      <ThemeContext.Provider value={{ themeName, toggleTheme }}>
        <ThemeProvider theme={theme}>
          <GlobalStyle />
          <div>
            {children}
          </div>
        </ThemeProvider>
      </ThemeContext.Provider>
    </div>
  );
};