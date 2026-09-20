import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../../core/i18n/strings.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/hazard_visuals.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/hazard_photo.dart';
import '../../../data/models/enums.dart';
import '../../../state/report_draft_controller.dart';

/// Step 4: the required photo plus an optional short note.
class StepPhoto extends StatefulWidget {
  const StepPhoto({super.key});

  @override
  State<StepPhoto> createState() => _StepPhotoState();
}

class _StepPhotoState extends State<StepPhoto> {
  final TextEditingController _description = TextEditingController();
  bool _attaching = false;

  @override
  void initState() {
    super.initState();
    _description.text = context.read<ReportDraftController>().description;
  }

  @override
  void dispose() {
    _description.dispose();
    super.dispose();
  }

  Future<void> _attach(ImageSource source) async {
    setState(() => _attaching = true);
    final String? error = await context
        .read<ReportDraftController>()
        .attachPhoto(source);
    if (!mounted) return;
    setState(() => _attaching = false);
    if (error != null) AppToast.error(context, error);
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final ReportDraftController draft = context.watch<ReportDraftController>();
    final bool hasPhoto = draft.photoPath != null;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      children: <Widget>[
        Text(
          s.stepPhotoTitle,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 6),
        Text(s.stepPhotoBody, style: Theme.of(context).textTheme.bodyMedium),
        const SizedBox(height: 18),
        if (hasPhoto)
          Stack(
            children: <Widget>[
              HazardPhoto(
                photoPath: draft.photoPath,
                type: draft.type ?? HazardType.other,
                height: 230,
                borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
              ),
              Positioned(
                right: 10,
                top: 10,
                child: Material(
                  color: Colors.black.withValues(alpha: 0.55),
                  shape: const CircleBorder(),
                  child: IconButton(
                    onPressed: draft.clearPhoto,
                    icon: const Icon(Icons.close, size: 19),
                    color: Colors.white,
                    tooltip: s.retakePhoto,
                  ),
                ),
              ),
            ],
          )
        else
          Container(
            height: 176,
            decoration: BoxDecoration(
              color: AppColors.surfaceAlt,
              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
              border: Border.all(
                color: AppColors.warning.withValues(alpha: 0.5),
                width: 1.5,
              ),
            ),
            child: Center(
              child: _attaching
                  ? const CircularProgressIndicator()
                  : Column(
                      mainAxisSize: MainAxisSize.min,
                      children: <Widget>[
                        Icon(
                          draft.type == null
                              ? Icons.add_a_photo_outlined
                              : HazardVisuals.icon(draft.type!),
                          size: 42,
                          color: AppColors.warningDark,
                        ),
                        const SizedBox(height: 10),
                        Text(
                          s.photoRequiredNotice,
                          style: const TextStyle(
                            color: AppColors.warningDark,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        const SizedBox(height: 14),
        Row(
          children: <Widget>[
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _attaching
                    ? null
                    : () => _attach(ImageSource.camera),
                icon: const Icon(Icons.photo_camera_outlined, size: 19),
                label: Text(
                  hasPhoto ? s.retakePhoto : s.takePhoto,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _attaching
                    ? null
                    : () => _attach(ImageSource.gallery),
                icon: const Icon(Icons.photo_library_outlined, size: 19),
                label: Text(
                  s.chooseFromGallery,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        Text(
          s.descriptionOptional,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _description,
          onChanged: draft.setDescription,
          maxLength: ReportDraftController.maxDescriptionLength,
          maxLines: 3,
          textCapitalization: TextCapitalization.sentences,
          decoration: InputDecoration(hintText: s.descriptionHint),
        ),
      ],
    );
  }
}
