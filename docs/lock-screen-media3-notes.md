# Controles da tela bloqueada Android

## Diagnóstico

O Android só mostra controles que estejam disponíveis na `MediaSession` e também no `Player` conectado a ela. O `expo-audio` reproduz uma faixa por vez; por isso, o player subjacente não anuncia navegação entre faixas, mesmo quando o APlayer mantém uma fila em JavaScript.

## Correção adotada

O módulo local de áudio usa um `ForwardingPlayer` que expõe os comandos padrão de faixa anterior e próxima faixa, anuncia também `hasPreviousMediaItem()` e `hasNextMediaItem()` como disponíveis quando a fila JavaScript tem vizinhos, e encaminha essas ações à fila do APlayer. Essa abordagem permite que telas de bloqueio que ignoram layouts de ações personalizados usem os comandos padrão da sessão.

## Fontes técnicas

- [Media3: controle de reprodução e preferências de botões](https://developer.android.com/media/media3/session/control-playback)
- [Referência de `MediaSession.Callback`](https://developer.android.com/reference/androidx/media3/session/MediaSession.Callback)
- [Implementação `ForwardingPlayer` do AndroidX Media](https://raw.githubusercontent.com/androidx/media/release/libraries/common/src/main/java/androidx/media3/common/ForwardingPlayer.java)
- [Discussão de compatibilidade de comandos anterior/próxima faixa no Media3](https://github.com/androidx/media/issues/1449)
