import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Trash2,
  AlertTriangle,
  TrendingUp,
  Award,
  CheckCircle2,
  Database,
  ArrowRight,
  HelpCircle,
  BarChart3,
  Loader2,
  FileSpreadsheet,
  Table as TableIcon,
  LineChart as LineIcon,
  PieChart as PieIcon,
  Cpu,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  assistantService,
  AssistantMessage,
  AssistantCalculation,
} from '../../services/assistantService';
import { marketService, MarketStatsResponse } from '../../services/marketService';
import { DynamicChatChart } from './DynamicChatChart';
import { DynamicChatTable } from './DynamicChatTable';

interface AIAssistantViewProps {
  onNavigateToMarketAnalysis?: () => void;
  onNavigateToImport?: () => void;
}

const PROCESSING_STEPS = [
  { step: 1, text: 'Compréhension de la requête (tolérance fautes & grammaire)...' },
  { step: 2, text: 'Interrogation de la base de données & analyse sémantique des colonnes...' },
  { step: 3, text: 'Calculs statistiques précis (min/max, moyennes, volumes, PDM)...' },
  { step: 4, text: 'Génération du format demandé (tableau, courbe, stats)...' },
];

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  onNavigateToMarketAnalysis,
  onNavigateToImport,
}) => {
  const [marketStats, setMarketStats] = useState<MarketStatsResponse | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showSchemaDrawer, setShowSchemaDrawer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch active imported dataset info on mount to initialize chat
  useEffect(() => {
    marketService.getMarketStats().then((data) => {
      setMarketStats(data);

      if (!data || !data.hasData || !data.totalRows || data.totalRows === 0) {
        setMessages([
          {
            id: 'welcome-no-data',
            sender: 'assistant',
            timestamp: 'À l’instant',
            text: "Bonjour ! Je suis votre **Assistant IA d'Analyse Automobile**.\n\n**Aucun fichier Excel n'est actuellement importé dans la plateforme.**\n\nPour que je puisse analyser vos données, comprendre les colonnes et générer des tableaux, courbes ou statistiques sur mesure, veuillez importer un fichier Excel (.xlsx ou .xls) dans la section **\"Données & Imports\"**.",
            calculations: [
              { label: 'Statut Base', value: 'Aucun fichier importé', type: 'warning' },
              { label: 'Analyse IA', value: 'En attente de données', type: 'default' },
            ],
            suggestedFollowUps: [
              'Comment importer un fichier Excel ?',
              'Quels formats de fichiers sont acceptés ?',
            ],
          },
        ]);
      } else {
        const schemaPlan = data.semanticSchema?.plan;
        const schemaNotice = schemaPlan
          ? `\n\n🧠 **Compréhension sémantique de la base :**\n- ${schemaPlan.dimensionRoleExplanation}\n- ${schemaPlan.metricRoleExplanation}`
          : '';

        setMessages([
          {
            id: 'welcome-with-data',
            sender: 'assistant',
            timestamp: 'À l’instant',
            text: `Bonjour ! Je suis votre **Assistant IA d'Analyse Automobile**.\n\nJe suis directement connecté aux données réelles de votre fichier importé **"${data.datasetName}"** (${data.totalRows} lignes analysées en base).${schemaNotice}\n\nVous pouvez me demander n'importe quel format de réponse selon votre besoin :\n- 📊 **Tableau :** *"Donne-moi un tableau complet des ventes"* ou *"tableau des 10 premiers"*\n- 📈 **Courbe :** *"Affiche la courbe des volumes"* ou *"courbe d'évolution"*\n- 🥧 **Camembert :** *"Répartition des parts de marché en camembert"*\n- 🏆 **Stats & Valeurs :** *"Qui est le meilleur et le plus faible ?"* ou *"volume global et stats"*\n\nJe tolère les fautes d'orthographe, syntaxiques ou abréviations et réponds avec les chiffres stricts de la base.`,
            calculations: [
              { label: 'Fichier Actif', value: data.datasetName || 'Fichier Excel', type: 'highlight' },
              { label: 'Lignes Réelles', value: `${data.totalRows} lignes`, type: 'default' },
              {
                label: 'Leader du Fichier',
                value: `${data.kpis.leader.brand} (${data.kpis.leader.sales.toLocaleString('fr-FR')})`,
                type: 'success',
              },
            ],
            suggestedFollowUps: [
              `Donne-moi un tableau complet des ventes`,
              `Affiche la courbe des volumes du fichier`,
              `Qui est le meilleur et qui est le plus bas ?`,
              `Répartition en camembert des parts de marché`,
            ],
          },
        ]);
      }
    });
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing, currentStepIndex]);

  // Stepper timer while processing
  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      setCurrentStepIndex(0);
      interval = setInterval(() => {
        setCurrentStepIndex((prev) => (prev < PROCESSING_STEPS.length - 1 ? prev + 1 : prev));
      }, 650);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isProcessing) return;

    const userMsgId = `user-${Date.now()}`;
    const newMsg: AssistantMessage = {
      id: userMsgId,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      text: textToSend.trim(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputQuery('');
    setIsProcessing(true);

    try {
      // Build conversation history for context
      const history = messages.slice(-4).map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const res = await assistantService.sendMessage(
        textToSend.trim(),
        marketStats?.datasetId || undefined,
        history
      );

      const botMsgId = `assistant-${Date.now()}`;
      const botResponse: AssistantMessage = {
        id: botMsgId,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        text: res.reply || 'Voici les résultats basés sur votre fichier importé.',
        calculations: res.calculations,
        chart: res.chart,
        table: res.table,
        schemaInsight: res.schemaInsight,
        missingDataNotice: res.missingDataNotice,
        suggestedFollowUps: res.suggestedFollowUps,
      };

      setMessages((prev) => [...prev, botResponse]);
    } catch (err: any) {
      const errorMsg: AssistantMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        text: "Désolé, une anomalie temporaire est survenue lors de l'analyse du fichier. Veuillez vérifier votre connexion ou réitérer votre question.",
        calculations: [],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    if (confirm('Voulez-vous réinitialiser la conversation avec l’Assistant IA ?')) {
      if (marketStats?.hasData) {
        setMessages([
          {
            id: 'welcome-reset',
            sender: 'assistant',
            timestamp: 'À l’instant',
            text: `Conversation réinitialisée. Posez-moi vos questions sur le fichier **"${marketStats.datasetName}"** ! Vous pouvez me demander un tableau, une courbe, ou des statistiques précises.`,
            calculations: [
              { label: 'Fichier', value: marketStats.datasetName || '', type: 'highlight' },
              { label: 'Lignes', value: `${marketStats.totalRows} lignes`, type: 'default' },
            ],
            suggestedFollowUps: [
              'Donne-moi un tableau des ventes',
              'Affiche la courbe des volumes',
              'Qui est le meilleur et le plus bas ?',
            ],
          },
        ]);
      } else {
        setMessages([
          {
            id: 'welcome-reset-empty',
            sender: 'assistant',
            timestamp: 'À l’instant',
            text: "Conversation réinitialisée. Veuillez importer un fichier Excel pour activer l'analyse.",
            calculations: [],
          },
        ]);
      }
    }
  };

  const hasData = Boolean(marketStats && marketStats.hasData && marketStats.totalRows && marketStats.totalRows > 0);
  const profiles = marketStats?.semanticSchema?.profiles || [];
  const plan = marketStats?.semanticSchema?.plan;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-6xl mx-auto space-y-4 animate-in fade-in duration-300">
      {/* Top Assistant Status Header */}
      <div className="bg-[#0e1626] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
            <Sparkles className="w-5 h-5 text-amber-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Assistant IA Automobile & Analyse Précise
              </h2>
              {hasData ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Base Active : {marketStats?.datasetName} ({marketStats?.totalRows} lignes)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/80 text-amber-400 border border-amber-800/60">
                  Aucun fichier importé
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Compréhension intelligente du schéma en base • Tableaux, courbes et statistiques à la demande
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasData && profiles.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSchemaDrawer(!showSchemaDrawer)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-800/60 hover:bg-slate-800 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Voir comment le système a compris les colonnes en base"
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Schéma Compris ({profiles.length})</span>
              {showSchemaDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}

          {onNavigateToMarketAnalysis && (
            <button
              type="button"
              onClick={onNavigateToMarketAnalysis}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 text-red-400" />
              <span>Observatoire Complet</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleClearHistory}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-red-950/40 hover:border-red-800/60 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
            title="Réinitialiser la conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Semantic Schema Understanding Drawer */}
      {showSchemaDrawer && hasData && (
        <div className="bg-[#0b1324] border border-cyan-900/60 rounded-2xl p-4 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Cartographie Sémantique des Colonnes de la Base
              </span>
            </div>
            {plan && (
              <span className="text-[11px] text-slate-400 font-mono">
                {plan.primaryDimensionCol} &rarr; {plan.primaryMetricCol}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto scrollbar-thin pr-1">
            {profiles.map((p, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-[#080d19] border border-slate-800 flex flex-col justify-between text-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="font-bold text-white truncate max-w-[150px]">
                      {p.originalHeader}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 uppercase">
                      {p.semanticRole}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {p.explanation}
                  </p>
                </div>
                <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Type : {p.detectedDataType}</span>
                  <span>Confiance : {Math.round(p.confidence * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Conversation Scroll Area */}
      <div className="flex-1 bg-[#0b1220] border border-slate-800/90 rounded-2xl p-4 sm:p-6 overflow-y-auto space-y-6 shadow-inner">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex gap-3 sm:gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-md ${
                  isUser
                    ? 'bg-slate-700 border border-slate-600'
                    : 'bg-gradient-to-tr from-red-600 to-rose-500 border border-red-500/50'
                }`}
              >
                {isUser ? <User className="w-5 h-5 text-slate-200" /> : <Bot className="w-5 h-5 text-white" />}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`flex flex-col max-w-[90%] sm:max-w-[82%] ${
                  isUser ? 'items-end' : 'items-start'
                }`}
              >
                {/* Bubble Container */}
                <div
                  className={`rounded-2xl p-4 sm:p-5 shadow-lg border ${
                    isUser
                      ? 'bg-red-600 text-white border-red-500 rounded-tr-none'
                      : 'bg-[#10192d] text-slate-200 border-slate-800 rounded-tl-none space-y-3'
                  }`}
                >
                  {/* Semantic Insight badge if present */}
                  {msg.schemaInsight && !isUser && (
                    <div className="px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-800/50 flex items-center gap-1.5 text-[11px] text-cyan-300 font-mono">
                      <Cpu className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                      <span>{msg.schemaInsight}</span>
                    </div>
                  )}

                  {/* Text with simple Markdown formatting */}
                  <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {msg.text.split('\n').map((line, lIdx) => {
                      const parts = line.split(/(\*\*.*?\*\*)/g);
                      return (
                        <p key={lIdx} className={line === '' ? 'h-2' : ''}>
                          {parts.map((p, pIdx) => {
                            if (p.startsWith('**') && p.endsWith('**')) {
                              return (
                                <strong key={pIdx} className="font-extrabold text-white">
                                  {p.slice(2, -2)}
                                </strong>
                              );
                            }
                            if (p.startsWith('*') && p.endsWith('*')) {
                              return (
                                <em key={pIdx} className="italic text-slate-300">
                                  {p.slice(1, -1)}
                                </em>
                              );
                            }
                            return p;
                          })}
                        </p>
                      );
                    })}
                  </div>

                  {/* Missing Data Warning Alert if requested metric is absent in file */}
                  {msg.missingDataNotice && (
                    <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/60 flex items-start gap-2.5 text-xs text-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold text-amber-300">
                          Précision sur les données :
                        </strong>
                        <span>{msg.missingDataNotice}</span>
                      </div>
                    </div>
                  )}

                  {/* Calculations Stat Badges */}
                  {msg.calculations && msg.calculations.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                        Indicateurs & Statistiques Calculés :
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {msg.calculations.map((calc, cIdx) => {
                          const isHigh = calc.type === 'highlight';
                          const isSucc = calc.type === 'success';
                          const isWarn = calc.type === 'warning';

                          return (
                            <div
                              key={cIdx}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-1.5 ${
                                isHigh
                                  ? 'bg-red-950/50 border-red-700/60 text-red-300'
                                  : isSucc
                                  ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300'
                                  : isWarn
                                  ? 'bg-amber-950/50 border-amber-700/60 text-amber-300'
                                  : 'bg-slate-900 border-slate-700/70 text-slate-300'
                              }`}
                            >
                              <span className="text-slate-400 text-[11px] font-sans">
                                {calc.label}:
                              </span>
                              <strong className="font-bold">{calc.value}</strong>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Table Component if returned */}
                  {msg.table && (
                    <div className="pt-2">
                      <DynamicChatTable data={msg.table} />
                    </div>
                  )}

                  {/* Dynamic Graphic Modelized in Chat (Curve, Bar, Pie) */}
                  {msg.chart && (
                    <div className="pt-2">
                      <DynamicChatChart config={msg.chart} />
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <span className="text-[10px] text-slate-500 font-mono mt-1 px-1">
                  {msg.timestamp}
                </span>

                {/* Suggested Follow-up chips */}
                {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && !isUser && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {msg.suggestedFollowUps.map((prompt, qIdx) => (
                      <button
                        key={qIdx}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <HelpCircle className="w-3 h-3 text-red-400" />
                        <span>{prompt}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Real-time processing progress with 4 steps */}
        {isProcessing && (
          <div className="flex gap-3 sm:gap-4 items-start animate-in fade-in duration-200">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center flex-shrink-0 text-white shadow-md">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>

            <div className="rounded-2xl p-4 sm:p-5 bg-[#10192d] border border-red-900/50 rounded-tl-none max-w-md w-full shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  Calcul & Traitement Sémantique...
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Étape {currentStepIndex + 1} / {PROCESSING_STEPS.length}
                </span>
              </div>

              {/* Progress Steps list */}
              <div className="space-y-2">
                {PROCESSING_STEPS.map((stepItem, idx) => {
                  const isDone = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;

                  return (
                    <div
                      key={stepItem.step}
                      className={`flex items-center gap-2 text-xs transition-opacity duration-200 ${
                        isDone
                          ? 'text-emerald-400 opacity-90'
                          : isCurrent
                          ? 'text-white font-semibold'
                          : 'text-slate-600 opacity-50'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-red-400 animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-700 flex-shrink-0" />
                      )}
                      <span className="truncate">{stepItem.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Format Action Chips */}
      {hasData && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap pl-1">
            Demander un format :
          </span>
          <button
            type="button"
            onClick={() => handleSend("Donne-moi la valeur exacte des ventes globales et du modèle leader")}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-emerald-900/60 hover:border-emerald-500 text-emerald-300 hover:text-white flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer text-xs"
          >
            <Award className="w-3 h-3 text-emerald-400" />
            <span>Valeur Précise (Sans graphique)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSend("Donne-moi un tableau complet des ventes et parts de marché")}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-cyan-900/60 hover:border-cyan-500 text-cyan-300 hover:text-white flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer text-xs"
          >
            <TableIcon className="w-3 h-3 text-cyan-400" />
            <span>Tableau des Ventes</span>
          </button>
          <button
            type="button"
            onClick={() => handleSend("Affiche la courbe d'évolution des ventes")}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-blue-900/60 hover:border-blue-500 text-blue-300 hover:text-white flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer text-xs"
          >
            <LineIcon className="w-3 h-3 text-blue-400" />
            <span>Courbe d'Évolution</span>
          </button>
          <button
            type="button"
            onClick={() => handleSend("Quelle est la répartition des parts de marché en camembert ?")}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-amber-900/60 hover:border-amber-500 text-amber-300 hover:text-white flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer text-xs"
          >
            <PieIcon className="w-3 h-3 text-amber-400" />
            <span>Camembert Parts de Marché</span>
          </button>
        </div>
      )}

      {/* Input Chat Box */}
      <div className="bg-[#0e1626] border border-slate-800 rounded-2xl p-3 shadow-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={textareaRef}
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              hasData
                ? `Posez une question sur "${marketStats?.datasetName}" (valeur d'un modèle/mois, tableau, courbe)...`
                : "Veuillez importer un fichier Excel pour poser des questions sur vos données..."
            }
            rows={1}
            disabled={isProcessing}
            className="flex-1 bg-slate-900/90 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-red-500 border border-slate-800 resize-none max-h-32"
          />

          <button
            type="submit"
            disabled={!inputQuery.trim() || isProcessing}
            className="p-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold shadow-lg shadow-red-950/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex-shrink-0"
            title="Envoyer le message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

