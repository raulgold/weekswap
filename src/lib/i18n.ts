// WeekSwap — Internationalization (i18n)
// Suporte: pt-BR (padrão) e en-US
// Moeda: BRL (R$) ou USD ($)

export type Language = 'pt-BR' | 'en-US';
export type Currency = 'BRL' | 'USD';

// Taxa de câmbio aproximada (pode ser buscada dinamicamente no futuro)
const USD_TO_BRL = 5.10;

export function convertCurrency(valueInBRL: number, currency: Currency): number {
  return currency === 'USD' ? valueInBRL / USD_TO_BRL : valueInBRL;
}

export function formatCurrency(valueInBRL: number, currency: Currency): string {
  const converted = convertCurrency(valueInBRL, currency);
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(converted);
}

export function formatPoints(points: number, lang: Language): string {
  return new Intl.NumberFormat(lang).format(points) + (lang === 'pt-BR' ? ' pts' : ' pts');
}

const translations: Record<Language, Record<string, string>> = {
  'pt-BR': {
    // Nav
    'nav.dashboard': 'Dashboard',
    'nav.weeks': 'Semanas',
    'nav.exchanges': 'Trocas',
    'nav.referral': 'Indicações',
    'nav.logout': 'Sair',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.points.available': 'Pontos Disponíveis',
    'dashboard.points.pending': 'Pontos Pendentes',
    'dashboard.exchanges.total': 'Total de Trocas',
    'dashboard.points.banner.title': 'Sistema de Pontos WeekSwap',
    'dashboard.points.banner.desc': 'R$ 1,00 = 100 pontos — igual ao RCI. Acumule e troque suas semanas!',
    'dashboard.points.banner.equivalent': 'em valor equivalente',
    'dashboard.buy.title': 'Comprar Pontos',
    'dashboard.buy.subtitle': 'R$ 1,00 = 100 pontos — mínimo R$ 5,00',
    'dashboard.buy.label.reais': 'Valor em Reais (R$)',
    'dashboard.buy.label.points': 'Você receberá',
    'dashboard.buy.btn': 'Comprar por',
    'dashboard.gold.title': 'Modo Ouro — R$ 200',
    'dashboard.gold.desc': 'Sua semana aparece sempre no topo dos anúncios por 30 dias. Troque mais rápido!',
    'dashboard.gold.badge1': 'Destaque no topo',
    'dashboard.gold.badge2': 'Badge exclusivo',
    'dashboard.gold.badge3': '30 dias de destaque',
    'dashboard.gold.where': 'Disponível em Minhas Semanas',
    'dashboard.recent.title': 'Trocas Recentes',
    'dashboard.recent.empty': 'Nenhuma troca ainda',
    'dashboard.recent.role.owner': 'Dono',
    'dashboard.recent.role.requester': 'Solicitante',
    'dashboard.pay.modal.title': 'Comprar Pontos',
    'dashboard.pay.modal.paying': 'Realizar Pagamento',
    'dashboard.pay.cpf': 'CPF',
    'dashboard.pay.pix': 'PIX',
    'dashboard.pay.pix.desc': 'Instantâneo',
    'dashboard.pay.boleto': 'Boleto',
    'dashboard.pay.boleto.desc': 'Até 3 dias úteis',
    'dashboard.pay.card': 'Cartão',
    'dashboard.pay.card.desc': 'Crédito/Débito',
    'dashboard.pay.btn.pay': 'Pagar',
    'dashboard.pay.btn.loading': 'Gerando cobrança...',
    'dashboard.pay.check': 'Já paguei — verificar status',
    'dashboard.pay.checking': 'Verificando...',
    'dashboard.pay.pix.success': 'PIX gerado com sucesso!',
    'dashboard.pay.pix.scan': 'Escaneie o QR code ou copie o código',
    'dashboard.pay.pix.code': 'Código copia e cola:',
    'dashboard.pay.pix.copy': 'Copiar',
    'dashboard.pay.pix.copied': 'Copiado!',
    'dashboard.pay.pix.hint': 'Abra o app do seu banco e escaneie o QR code ou cole o código PIX',
    'dashboard.pay.boleto.success': 'Boleto gerado!',
    'dashboard.pay.boleto.due': 'Vencimento em 1 dia útil',
    'dashboard.pay.boleto.open': 'Abrir Boleto',
    'dashboard.pay.card.success': 'Cobrança criada!',
    'dashboard.pay.card.hint': 'Clique abaixo para inserir os dados do cartão',
    'dashboard.pay.card.btn': 'Pagar com Cartão',
    'dashboard.pay.invoice': 'Ver fatura',
    'dashboard.confirmed': 'Pagamento confirmado! Seus pontos serão liberados em breve.',

    // Weeks
    'weeks.title': 'Semanas',
    'weeks.publish.btn': 'Publicar Minha Semana',
    'weeks.cancel.btn': 'Cancelar',
    'weeks.tab.available': 'Disponíveis',
    'weeks.tab.mine': 'Minhas Semanas',
    'weeks.form.title': 'Dados da Semana',
    'weeks.form.resort': 'Nome do Resort / Empreendimento *',
    'weeks.form.city': 'Cidade *',
    'weeks.form.state': 'Estado *',
    'weeks.form.state.select': 'Selecione',
    'weeks.form.type': 'Tipo de Unidade *',
    'weeks.form.season': 'Temporada *',
    'weeks.form.capacity': 'Capacidade (pessoas)',
    'weeks.form.checkin': 'Data Check-in *',
    'weeks.form.checkout': 'Data Check-out *',
    'weeks.form.cert': 'Nº do Certificado / Contrato',
    'weeks.form.desc': 'Descrição',
    'weeks.form.obs': 'Preferências de troca / Observações',
    'weeks.form.submit': 'Publicar Semana para Troca',
    'weeks.form.submitting': 'Publicando...',
    'weeks.form.uploading': 'Enviando documentos...',
    'weeks.gold.activate': 'Ativar Modo Ouro — R$ 200',
    'weeks.gold.active': 'Modo Ouro ativo',
    'weeks.exchange.btn': 'Solicitar Troca',
    'weeks.exchange.requesting': 'Solicitando...',
    'weeks.empty.available': 'Nenhuma semana disponível no momento',
    'weeks.empty.mine': 'Você ainda não publicou nenhuma semana',
    'weeks.published.link': 'Publicar minha primeira semana →',
    'weeks.delivered': 'Entregue',
    'weeks.published': 'Publicada — disponível para troca',
    'weeks.people': 'pessoas',

    // Exchanges
    'exchanges.title': 'Minhas Trocas',
    'exchanges.empty': 'Nenhuma troca ainda',
    'exchanges.role.owner': 'Você é o proprietário',
    'exchanges.role.requester': 'Você solicitou',
    'exchanges.confirm': 'Confirmar Troca',
    'exchanges.complete': 'Finalizar Troca',
    'exchanges.cancel': 'Cancelar',
    'exchanges.status.pending': 'Pendente',
    'exchanges.status.confirmed': 'Confirmada',
    'exchanges.status.finalized': 'Finalizada',
    'exchanges.status.cancelled': 'Cancelada',
  },

  'en-US': {
    // Nav
    'nav.dashboard': 'Dashboard',
    'nav.weeks': 'Weeks',
    'nav.exchanges': 'Exchanges',
    'nav.referral': 'Referrals',
    'nav.logout': 'Sign out',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.points.available': 'Available Points',
    'dashboard.points.pending': 'Pending Points',
    'dashboard.exchanges.total': 'Total Exchanges',
    'dashboard.points.banner.title': 'WeekSwap Points System',
    'dashboard.points.banner.desc': 'BRL 1.00 = 100 points — just like RCI. Earn and swap your weeks!',
    'dashboard.points.banner.equivalent': 'equivalent value',
    'dashboard.buy.title': 'Buy Points',
    'dashboard.buy.subtitle': 'BRL 1.00 = 100 points — minimum BRL 5.00',
    'dashboard.buy.label.reais': 'Amount in BRL (R$)',
    'dashboard.buy.label.points': "You'll receive",
    'dashboard.buy.btn': 'Buy for',
    'dashboard.gold.title': 'Gold Mode — R$ 200',
    'dashboard.gold.desc': 'Your week appears at the top of all listings for 30 days. Swap faster!',
    'dashboard.gold.badge1': 'Top placement',
    'dashboard.gold.badge2': 'Exclusive badge',
    'dashboard.gold.badge3': '30 days featured',
    'dashboard.gold.where': 'Available in My Weeks',
    'dashboard.recent.title': 'Recent Exchanges',
    'dashboard.recent.empty': 'No exchanges yet',
    'dashboard.recent.role.owner': 'Owner',
    'dashboard.recent.role.requester': 'Requester',
    'dashboard.pay.modal.title': 'Buy Points',
    'dashboard.pay.modal.paying': 'Make Payment',
    'dashboard.pay.cpf': 'CPF (Brazilian ID)',
    'dashboard.pay.pix': 'PIX',
    'dashboard.pay.pix.desc': 'Instant',
    'dashboard.pay.boleto': 'Boleto',
    'dashboard.pay.boleto.desc': 'Up to 3 business days',
    'dashboard.pay.card': 'Card',
    'dashboard.pay.card.desc': 'Credit/Debit',
    'dashboard.pay.btn.pay': 'Pay',
    'dashboard.pay.btn.loading': 'Generating charge...',
    'dashboard.pay.check': 'Already paid — check status',
    'dashboard.pay.checking': 'Checking...',
    'dashboard.pay.pix.success': 'PIX generated successfully!',
    'dashboard.pay.pix.scan': 'Scan the QR code or copy the code',
    'dashboard.pay.pix.code': 'Copy & paste code:',
    'dashboard.pay.pix.copy': 'Copy',
    'dashboard.pay.pix.copied': 'Copied!',
    'dashboard.pay.pix.hint': 'Open your banking app and scan the QR code or paste the PIX code',
    'dashboard.pay.boleto.success': 'Boleto generated!',
    'dashboard.pay.boleto.due': 'Due in 1 business day',
    'dashboard.pay.boleto.open': 'Open Boleto',
    'dashboard.pay.card.success': 'Charge created!',
    'dashboard.pay.card.hint': 'Click below to enter your card details',
    'dashboard.pay.card.btn': 'Pay with Card',
    'dashboard.pay.invoice': 'View invoice',
    'dashboard.confirmed': 'Payment confirmed! Your points will be released shortly.',

    // Weeks
    'weeks.title': 'Weeks',
    'weeks.publish.btn': 'List My Week',
    'weeks.cancel.btn': 'Cancel',
    'weeks.tab.available': 'Available',
    'weeks.tab.mine': 'My Weeks',
    'weeks.form.title': 'Week Details',
    'weeks.form.resort': 'Resort / Development Name *',
    'weeks.form.city': 'City *',
    'weeks.form.state': 'State *',
    'weeks.form.state.select': 'Select',
    'weeks.form.type': 'Unit Type *',
    'weeks.form.season': 'Season *',
    'weeks.form.capacity': 'Capacity (people)',
    'weeks.form.checkin': 'Check-in Date *',
    'weeks.form.checkout': 'Check-out Date *',
    'weeks.form.cert': 'Certificate / Contract No.',
    'weeks.form.desc': 'Description',
    'weeks.form.obs': 'Exchange preferences / Notes',
    'weeks.form.submit': 'List Week for Exchange',
    'weeks.form.submitting': 'Publishing...',
    'weeks.form.uploading': 'Uploading documents...',
    'weeks.gold.activate': 'Activate Gold Mode — R$ 200',
    'weeks.gold.active': 'Gold Mode active',
    'weeks.exchange.btn': 'Request Exchange',
    'weeks.exchange.requesting': 'Requesting...',
    'weeks.empty.available': 'No weeks available right now',
    'weeks.empty.mine': "You haven't listed any weeks yet",
    'weeks.published.link': 'List my first week →',
    'weeks.delivered': 'Delivered',
    'weeks.published': 'Listed — available for exchange',
    'weeks.people': 'people',

    // Exchanges
    'exchanges.title': 'My Exchanges',
    'exchanges.empty': 'No exchanges yet',
    'exchanges.role.owner': 'You are the owner',
    'exchanges.role.requester': 'You requested',
    'exchanges.confirm': 'Confirm Exchange',
    'exchanges.complete': 'Complete Exchange',
    'exchanges.cancel': 'Cancel',
    'exchanges.status.pending': 'Pending',
    'exchanges.status.confirmed': 'Confirmed',
    'exchanges.status.finalized': 'Finalized',
    'exchanges.status.cancelled': 'Cancelled',
  },
};

export function t(key: string, lang: Language): string {
  return translations[lang]?.[key] ?? translations['pt-BR'][key] ?? key;
}

export default translations;
