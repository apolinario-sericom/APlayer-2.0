# Controles de mídia nativos

O `expo-audio` mantém a reprodução em segundo plano e publica metadados para a tela bloqueada, mas a interface de bloqueio expõe apenas avanço e retrocesso por tempo; ela não oferece comandos de **próxima faixa** e **faixa anterior** para filas de música. Esta limitação está documentada na issue oficial do Expo [#43538](https://github.com/expo/expo/issues/43538), consultada em 18 de agosto de 2026.

Para controles completos de mídia (pausar, reproduzir, próxima e anterior) com fila e execução em segundo plano, o projeto inclui `react-native-track-player`, cujo README informa suporte a controles de mídia, reprodução em segundo plano e arquivos locais. A integração exige um build nativo de desenvolvimento/produção; esses comandos não podem ser validados pelo preview web.
