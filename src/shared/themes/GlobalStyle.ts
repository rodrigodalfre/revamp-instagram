import { createGlobalStyle } from 'styled-components';
import '../fonts/fonts.css';

interface IPropsTheme {
  theme: {
    primaryColor: string,
    secondaryColor: string,
    backgroundColor: string,
    textColor: string,
    borderRadius: string,
  }
}

export const GlobalStyle = createGlobalStyle<IPropsTheme>`
  @import './fonts/fonts.css';

  *{
    margin: 0;
    padding: 0;
  }

  body {
    background: ${props => props.theme.backgroundColor};
    font-family: sans-serif;
  }
`
