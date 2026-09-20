import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/strings.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/common.dart';
import '../../data/repositories/bantay_repository.dart';

/// FAQ accordion plus the sample-data reset.
class HelpSupportScreen extends StatelessWidget {
  const HelpSupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    final List<(String, String)> faqs = <(String, String)>[
      (s.faqQ1, s.faqA1),
      (s.faqQ2, s.faqA2),
      (s.faqQ3, s.faqA3),
      (s.faqQ4, s.faqA4),
      (s.faqQ5, s.faqA5),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(s.helpAndSupport),
        leading: const BackButton(),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
        children: <Widget>[
          SectionCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: <Widget>[
                for (int i = 0; i < faqs.length; i++) ...<Widget>[
                  if (i > 0) const Divider(height: 1),
                  _FaqTile(question: faqs[i].$1, answer: faqs[i].$2),
                ],
              ],
            ),
          ),
          SectionHeader(title: s.resetDemoData),
          SectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  s.resetDemoDataDesc,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () async {
                    final bool confirmed = await confirmDialog(
                      context,
                      title: s.resetDemoData,
                      message: s.resetDemoDataDesc,
                      confirmLabel: s.confirm,
                      cancelLabel: s.cancel,
                    );
                    if (!confirmed || !context.mounted) return;
                    await context.read<BantayRepository>().resetToSeedData();
                    if (!context.mounted) return;
                    AppToast.success(context, s.resetDoneToast);
                  },
                  icon: const Icon(Icons.restore, size: 19),
                  label: Text(s.resetDemoData),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.inkMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FaqTile extends StatelessWidget {
  const _FaqTile({required this.question, required this.answer});

  final String question;
  final String answer;

  @override
  Widget build(BuildContext context) {
    return Theme(
      // ExpansionTile draws its own dividers by default, which would double
      // up with the ones this list already draws between tiles.
      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
      child: ExpansionTile(
        title: Text(question, style: Theme.of(context).textTheme.titleMedium),
        tilePadding: const EdgeInsets.symmetric(horizontal: 16),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        expandedCrossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(answer, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}
