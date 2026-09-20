import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/geo/lat_lng.dart';
import '../../core/i18n/strings.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/common.dart';
import '../../data/models/hazard_report.dart';
import '../../data/repositories/bantay_repository.dart';
import '../../state/location_controller.dart';
import '../../state/report_draft_controller.dart';
import 'report_success_screen.dart';
import 'steps/step_location.dart';
import 'steps/step_photo.dart';
import 'steps/step_severity.dart';
import 'steps/step_type.dart';

/// The four-step guided hazard report.
///
/// Each step is a separate widget but they share one [ReportDraftController],
/// so going back never loses input and the Next button can reflect whether
/// the current step is actually complete.
class ReportFlowScreen extends StatefulWidget {
  const ReportFlowScreen({super.key, this.initialLocation});

  /// Pre-places the pin, used when reporting from a specific map position.
  final LatLng? initialLocation;

  @override
  State<ReportFlowScreen> createState() => _ReportFlowScreenState();
}

class _ReportFlowScreenState extends State<ReportFlowScreen> {
  late final ReportDraftController _draft;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _draft = ReportDraftController(
      initialLocation:
          widget.initialLocation ?? context.read<LocationController>().current,
    );
  }

  @override
  void dispose() {
    _draft.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final S s = S.of(context);
    if (_draft.photoPath == null) {
      AppToast.error(context, s.photoRequiredNotice);
      return;
    }

    setState(() => _submitting = true);

    final HazardReport report = await context
        .read<BantayRepository>()
        .submitReport(
          type: _draft.type!,
          severity: _draft.severity!,
          location: _draft.location,
          addressLabel: _draft.addressLabel,
          description: _draft.description,
          photoPath: _draft.photoPath,
        );

    if (!mounted) return;
    setState(() => _submitting = false);

    await Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (BuildContext _) => ReportSuccessScreen(report: report),
      ),
    );
  }

  Future<bool> _confirmDiscard() async {
    final S s = S.of(context);
    // Nothing entered yet: leaving costs the user nothing, so do not nag.
    if (_draft.type == null &&
        _draft.severity == null &&
        _draft.photoPath == null) {
      return true;
    }
    return confirmDialog(
      context,
      title: s.cancel,
      message: s.isFilipino
          ? 'Mawawala ang report na sinisimulan mo. Ituloy?'
          : 'Your unfinished report will be discarded. Leave anyway?',
      confirmLabel: s.confirm,
      cancelLabel: s.back,
    );
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    return ChangeNotifierProvider<ReportDraftController>.value(
      value: _draft,
      child: Consumer<ReportDraftController>(
        builder:
            (BuildContext context, ReportDraftController draft, Widget? _) {
              return PopScope(
                canPop: false,
                onPopInvokedWithResult: (bool didPop, Object? result) async {
                  if (didPop) return;
                  if (!draft.isFirstStep) {
                    draft.previousStep();
                    return;
                  }
                  if (await _confirmDiscard() && context.mounted) {
                    Navigator.of(context).pop();
                  }
                },
                child: Scaffold(
                  appBar: AppBar(
                    title: Text(s.reportHazard),
                    leading: IconButton(
                      icon: Icon(
                        draft.isFirstStep ? Icons.close : Icons.arrow_back,
                      ),
                      tooltip: draft.isFirstStep ? s.cancel : s.back,
                      onPressed: () async {
                        if (!draft.isFirstStep) {
                          draft.previousStep();
                          return;
                        }
                        if (await _confirmDiscard() && context.mounted) {
                          Navigator.of(context).pop();
                        }
                      },
                    ),
                    bottom: PreferredSize(
                      preferredSize: const Size.fromHeight(46),
                      child: _StepIndicator(draft: draft),
                    ),
                  ),
                  body: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 220),
                    child: KeyedSubtree(
                      key: ValueKey<int>(draft.step),
                      child: switch (draft.step) {
                        0 => const StepLocation(),
                        1 => const StepType(),
                        2 => const StepSeverity(),
                        _ => const StepPhoto(),
                      },
                    ),
                  ),
                  bottomNavigationBar: _FlowFooter(
                    draft: draft,
                    submitting: _submitting,
                    onNext: draft.isLastStep ? _submit : draft.nextStep,
                  ),
                ),
              );
            },
      ),
    );
  }
}

/// "Step 2 of 4" with a progress bar.
class _StepIndicator extends StatelessWidget {
  const _StepIndicator({required this.draft});

  final ReportDraftController draft;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            '${s.stepOf} ${draft.step + 1}/${ReportDraftController.stepCount}',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppColors.inkMuted,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: List<Widget>.generate(
              ReportDraftController.stepCount,
              (int i) => Expanded(
                child: Padding(
                  padding: EdgeInsets.only(
                    right: i == ReportDraftController.stepCount - 1 ? 0 : 5,
                  ),
                  child: GestureDetector(
                    // Tapping a completed step jumps back to it; forward
                    // steps stay locked until the current one is valid.
                    onTap: () => draft.goToStep(i),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 240),
                      height: 5,
                      decoration: BoxDecoration(
                        color: i <= draft.step
                            ? AppColors.brandRed
                            : AppColors.line,
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FlowFooter extends StatelessWidget {
  const _FlowFooter({
    required this.draft,
    required this.submitting,
    required this.onNext,
  });

  final ReportDraftController draft;
  final bool submitting;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.line)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              if (draft.isLastStep && draft.photoPath == null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    children: <Widget>[
                      const Icon(
                        Icons.info_outline,
                        size: 16,
                        color: AppColors.warningDark,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          s.photoRequiredNotice,
                          style: const TextStyle(
                            fontSize: 12.5,
                            color: AppColors.warningDark,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              Row(
                children: <Widget>[
                  if (!draft.isFirstStep) ...<Widget>[
                    Expanded(
                      child: OutlinedButton(
                        onPressed: submitting ? null : draft.previousStep,
                        child: Text(s.back),
                      ),
                    ),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    flex: 2,
                    child: LoadingButton(
                      label: draft.isLastStep ? s.submitReport : s.next,
                      icon: draft.isLastStep ? Icons.send_rounded : null,
                      isLoading: submitting,
                      onPressed: draft.canAdvance ? onNext : null,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
