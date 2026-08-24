# Design do Melodia

O **Melodia** será um tocador de músicas local com atmosfera noturna, centrado na escuta contínua e no controle rápido com uma só mão. A interface seguirá a orientação vertical 9:16 e uma linguagem visual inspirada em players de alta fidelidade: superfícies escuras em camadas, roxo profundo como cor de destaque e gradientes quentes provenientes das capas. Os controles de reprodução ficam sempre acessíveis por meio de um mini-player acima da navegação inferior.

## Direção visual

| Elemento | Decisão de design |
|---|---|
| Fundo principal | Azul-noite `#0B0B12`, para reduzir brilho durante a escuta. |
| Superfícies | Grafite-violeta `#161622` e `#202030`, criando hierarquia sem bordas pesadas. |
| Cor de ação | Lilás elétrico `#A78BFA`, aplicado aos controles ativos e ao progresso. |
| Destaque secundário | Coral suave `#FB7185`, usado para favoritos e estados selecionados. |
| Tipografia | Hierarquia ampla e legível, com títulos fortes, metadados discretos e números tabulares no player. |
| Controles | Alvos de toque de no mínimo 44 pt, feedback de pressão suave e haptics apenas em ações relevantes. |

## Lista de telas

| Tela | Conteúdo principal | Funções principais |
|---|---|---|
| Início | Saudação, música tocando recentemente, atalhos para favoritos e playlists, faixas reproduzidas recentemente. | Retomar uma música, abrir a fila e acessar rapidamente coleções. |
| Biblioteca | Busca, filtros por músicas, artistas, álbuns e pastas, lista de faixas importadas. | Importar arquivos de áudio, pesquisar biblioteca, reproduzir, favoritar e abrir detalhes. |
| Player | Capa em destaque, título, artista, álbum, barra de progresso, controles, fila e acesso à letra. | Pausar/reproduzir, avançar, voltar, repetir, embaralhar, abrir fila e navegar pela letra. |
| Letras | Letra salva localmente com a linha ativa destacada conforme o tempo de reprodução. | Ler letras, inserir e editar marcações de tempo simples. |
| Playlists | Grade de playlists com capas, quantidade de faixas e ação para criar uma nova. | Criar playlists ilimitadas, editar título/capa, adicionar/remover músicas e tocar coleção. |
| Detalhe da música | Informações da faixa, capa, apelido, artista, álbum, letra e playlists associadas. | Definir apelido, editar artista/álbum locais, trocar capa e adicionar letra. |
| Configurações | Preferências de visual, importação, letras e armazenamento de dados locais. | Escolher capa personalizada, gerir permissões de mídia, limpar cache local e acessar ajuda. |

## Fluxos essenciais

O fluxo central começa na **Biblioteca**: a pessoa toca em “Importar músicas”, escolhe arquivos de áudio disponíveis no armazenamento interno, cartão de memória ou provedor de arquivos do dispositivo, e as faixas passam a aparecer na biblioteca local. Ao tocar em uma faixa, o mini-player se torna visível; um toque nele abre o **Player** completo, onde a fila e os controles de reprodução ficam disponíveis.

Para personalização, a pessoa abre o menu de uma faixa e entra em **Editar informações**. Ali poderá definir um apelido exibido somente no Melodia, ajustar artista e álbum locais, escolher uma imagem da galeria para a capa e inserir ou editar a letra. A letra é exibida em uma tela própria; quando houver marcações de tempo, a linha correspondente acompanha a reprodução. Sem marcações, o aplicativo mostra a letra em rolagem livre, sem alegar sincronização automática.

Para organizar músicas, a pessoa entra na aba **Playlists**, toca em “Nova playlist”, escolhe título e imagem, e adiciona qualquer quantidade de faixas pela biblioteca. As mudanças são persistidas imediatamente no armazenamento local e refletidas no Início, na Biblioteca e na própria playlist.

## Decisões de produto e sugestões incorporadas

O primeiro lançamento será **local e privado**, sem conta obrigatória ou sincronização em nuvem. Esse recorte mantém os arquivos e metadados do usuário no dispositivo e evita dependência de serviços externos. Além dos recursos solicitados, o produto incluirá favoritos, fila de reprodução, modo aleatório, repetição e uma área de “tocadas recentemente”, pois são controles esperados em um player moderno e tornam a navegação mais fluida.

O app não altera metadados gravados no arquivo original. Os campos editados funcionam como uma camada de metadados locais — apelido, artista, álbum, capa e letra — que preserva o arquivo de áudio do usuário e pode ser atualizada posteriormente no próprio Melodia.
